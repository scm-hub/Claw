import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, InputAdornment, IconButton, CircularProgress,
} from '@mui/material';
import { Search, MyLocation } from '@mui/icons-material';
import api from '../lib/api';

const AMAP_KEY = '270f0501ec49e95ae86474330ed8d780';

let amapReady = false;
let amapPromise = null;

function loadAmap() {
  if (amapReady) return Promise.resolve();
  if (amapPromise) return amapPromise;
  amapPromise = new Promise((resolve, reject) => {
    if (window.AMap) { amapReady = true; resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Geocoder`;
    script.onload = () => { amapReady = true; resolve(); };
    script.onerror = () => { amapPromise = null; reject(new Error('高德地图加载失败')); };
    document.head.appendChild(script);
  });
  return amapPromise;
}

export default function MapPicker({ open, onClose, onConfirm, title = '在地图上选择位置' }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [pickedAddress, setPickedAddress] = useState('');
  const [pickedName, setPickedName] = useState('');
  const [pickedLng, setPickedLng] = useState('');
  const [pickedLat, setPickedLat] = useState('');
  const [searchTips, setSearchTips] = useState([]);

  // 逆地理编码：坐标 → 地址
  const reverseGeocode = useCallback((lng, lat) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.getAddress([lng, lat], (status, result) => {
      console.log('[MapPicker] 逆地理编码 status:', status, 'result:', result);
      if (status === 'complete' && result.regeocode) {
        const addr = result.regeocode.formattedAddress || '';
        setPickedAddress(addr);
        setPickedName(result.regeocode.addressComponent?.building
          || result.regeocode.addressComponent?.streetNumber?.street
          || addr.split('省').pop()?.split('市').pop()?.slice(0, 30)
          || addr.slice(0, 30));
        setPickedLng(String(lng));
        setPickedLat(String(lat));
      } else {
        console.warn('[MapPicker] 逆地理编码失败:', status, result);
        setError('无法获取该位置的地址信息，请尝试搜索定位');
      }
    });
  }, []);

  // 初始化地图
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    setPickedAddress('');
    setPickedName('');
    setPickedLng('');
    setPickedLat('');
    setSearchText('');

    loadAmap()
      .then(() => {
        // 延迟确保 DOM 已渲染
        setTimeout(() => {
          if (!mapContainer.current) return;

          const map = new window.AMap.Map(mapContainer.current, {
            zoom: 13,
            center: [117.000923, 36.675807], // 默认淄博中心
            resizeEnable: true,
          });
          mapRef.current = map;

          // 插件
          window.AMap.plugin(['AMap.Geocoder'], () => {
            geocoderRef.current = new window.AMap.Geocoder({});
          });

          // 点击地图选点
          map.on('click', (e) => {
            const { lng, lat } = e.lnglat;
            // 更新标记
            if (markerRef.current) {
              markerRef.current.setPosition([lng, lat]);
            } else {
              markerRef.current = new window.AMap.Marker({
                position: [lng, lat],
                map,
                animation: 'AMAP_ANIMATION_DROP',
              });
            }
            reverseGeocode(lng, lat);
          });

          setLoading(false);
        }, 200);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        markerRef.current = null;
        geocoderRef.current = null;
      }
    };
  }, [open, reverseGeocode]);

  // 搜索地址（通过 SCM 后端代理高德 inputtips，避免前端跨域和 Key 权限问题）
  const handleSearch = useCallback(async () => {
    const text = searchText.trim();
    if (!text) return;
    try {
      // 使用 api.js 封装，自动处理 BASE_URL (/api vs /scm/api) 和 token
      const json = await api.get('/address/search', { params: { keyword: text } });
      if (json.success && json.data) {
        const tips = json.data
          .filter(t => t.location && typeof t.location === 'string' && t.location.includes(','))
          .map(t => {
            const [lng, lat] = t.location.split(',').map(Number);
            return {
              name: t.name,
              district: t.district || '',
              address: t.address || '',
              lng,
              lat,
              location: { lng, lat },
            };
          });
        setSearchTips(tips);
      } else {
        setSearchTips([]);
      }
    } catch (err) {
      console.error('搜索失败:', err);
      setSearchTips([]);
    }
  }, [searchText]);

  // 选择一个搜索建议
  const selectTip = (tip) => {
    const { lng, lat } = tip.location;
    // 移动地图中心
    if (mapRef.current) {
      mapRef.current.setCenter([lng, lat]);
      mapRef.current.setZoom(16);
      // 更新标记
      if (markerRef.current) {
        markerRef.current.setPosition([lng, lat]);
      } else {
        markerRef.current = new window.AMap.Marker({
          position: [lng, lat],
          map: mapRef.current,
          animation: 'AMAP_ANIMATION_DROP',
        });
      }
    }
    setPickedAddress(tip.district + tip.name);
    setPickedName(tip.name);
    setPickedLng(String(lng));
    setPickedLat(String(lat));
    setSearchTips([]);
  };

  // 确认选择
  const handleConfirm = () => {
    if (!pickedAddress) return;
    onConfirm({
      address: pickedAddress,
      name: pickedName,
      lng: pickedLng,
      lat: pickedLat,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* 搜索栏 */}
        <Box sx={{ position: 'absolute', top: 8, left: 8, right: 8, zIndex: 999 }}>
          <TextField
            id="amap-search-input"
            size="small"
            fullWidth
            placeholder="搜索地址…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              sx: { bgcolor: 'white', borderRadius: 1 },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleSearch}>
                    <Search fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {/* 搜索建议列表 */}
          {searchTips.length > 0 && (
            <Box sx={{
              mt: 0.5, bgcolor: 'white', borderRadius: 1, boxShadow: 3,
              maxHeight: 200, overflow: 'auto',
            }}>
              {searchTips.map((tip, i) => (
                <Box
                  key={i}
                  sx={{
                    px: 2, py: 1, cursor: 'pointer', fontSize: '0.85rem',
                    borderBottom: '1px solid #f0f0f0',
                    '&:hover': { bgcolor: '#f5f5f5' },
                  }}
                  onClick={() => selectTip(tip)}
                >
                  <Typography variant="body2" fontWeight={500}>{tip.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{tip.district}{tip.address || ''}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* 地图区域 */}
        <Box
          ref={mapContainer}
          sx={{ width: '100%', height: 450, bgcolor: '#f0f0f0' }}
        >
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <CircularProgress size={40} />
            </Box>
          )}
          {error && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}
        </Box>

        {/* 选中的地址信息 */}
        {pickedAddress && (
          <Box sx={{ px: 2, py: 1.5, bgcolor: '#e8f5e9', display: 'flex', alignItems: 'center', gap: 1 }}>
            <MyLocation color="success" fontSize="small" />
            <Box>
              <Typography variant="body2" fontWeight={600}>{pickedName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {pickedAddress}
                {pickedLng && `（${pickedLng}, ${pickedLat}）`}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, ml: 2 }}>
          点击地图任意位置选点，或搜索地址定位
        </Typography>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!pickedAddress}>
          确认选择此位置
        </Button>
      </DialogActions>
    </Dialog>
  );
}
