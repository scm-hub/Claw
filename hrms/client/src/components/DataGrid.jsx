import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TextField,
  Box,
  InputAdornment,
  Checkbox,
  Toolbar,
  Typography,
  Tooltip,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

export default function DataGrid({
  columns,
  rows,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSearch,
  searchPlaceholder = '搜索...',
  // 多选相关
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId = (row) => row.id,
  // 工具栏额外内容
  selectionToolbar,
}) {
  const [keyword, setSearchKeyword] = useState('');

  const handleSearch = (e) => {
    setSearchKeyword(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const allIds = rows.map(getRowId);
  const isAllSelected = selectable && allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const isSomeSelected = selectable && !isAllSelected && allIds.some((id) => selectedIds.includes(id));

  const handleSelectAll = (e) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      // 合并：当前页全部选中（去重）
      const newSelected = [...new Set([...selectedIds, ...allIds])];
      onSelectionChange(newSelected);
    } else {
      // 取消当前页全选
      const newSelected = selectedIds.filter((id) => !allIds.includes(id));
      onSelectionChange(newSelected);
    }
  };

  const handleSelectRow = (id) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <Paper>
      {onSearch && (
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={keyword}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchIcon /></InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
        </Box>
      )}

      {/* 多选工具栏 */}
      {selectable && selectedIds.length > 0 && selectionToolbar && (
        <Toolbar sx={{ bgcolor: 'primary.50', borderBottom: '1px solid #e0e0e0', gap: 2, minHeight: '48px !important' }}>
          <Typography variant="body2" sx={{ flex: 1, color: 'primary.main', fontWeight: 600 }}>
            已选择 {selectedIds.length} 项
          </Typography>
          {selectionToolbar}
        </Toolbar>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" sx={{ bgcolor: '#fafafa', width: 48 }}>
                  <Checkbox
                    indeterminate={isSomeSelected}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    size="small"
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell key={col.field} sx={{ fontWeight: 'bold', bgcolor: '#fafafa' }}>
                  {col.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => {
                const rowId = getRowId(row);
                const isSelected = selectable && selectedIds.includes(rowId);
                return (
                  <TableRow key={rowId || idx} hover selected={isSelected}>
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowId)}
                          size="small"
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.field}>
                        {col.renderCell ? col.renderCell(row) : row[col.field]}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {onPageChange && (
        <TablePagination
          component="div"
          count={totalCount || rows.length}
          page={page || 0}
          onPageChange={(e, newPage) => onPageChange(newPage + 1)}
          rowsPerPage={pageSize || 10}
          onRowsPerPageChange={(e) => {
            if (onPageSizeChange) onPageSizeChange(parseInt(e.target.value, 10));
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
        />
      )}
    </Paper>
  );
}
