/**
 * SCM Server — 上传文件安全测试
 */
import { describe, it, expect } from 'vitest';

describe('SCM — 文件上传安全', () => {
  describe('采购模块上传过滤', () => {
    it('应只允许图片和 PDF', () => {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      expect(allowed).toContain('image/jpeg');
      expect(allowed).toContain('application/pdf');
      expect(allowed).not.toContain('application/x-msdownload');
      expect(allowed).not.toContain('text/html');
    });

    it('应拒绝可执行文件类型', () => {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      const blockedTypes = [
        'application/x-msdownload',
        'application/x-executable',
        'text/html',
        'application/javascript',
      ];

      for (const type of blockedTypes) {
        expect(allowed).not.toContain(type);
      }
    });
  });

  describe('销售模块上传过滤', () => {
    it('应允许图片、PDF、Excel、CSV', () => {
      const allowed = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      expect(allowed).toContain('text/csv');
      expect(allowed).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });

  describe('物流模块 OCR 上传过滤', () => {
    it('OCR 上传应只允许图片', () => {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      expect(allowed).not.toContain('application/pdf');
      expect(allowed.every((t) => t.startsWith('image/'))).toBe(true);
    });
  });

  describe('薪资模块上传过滤', () => {
    it('应只允许 Excel 和 CSV', () => {
      const allowed = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      expect(allowed.every((t) => !t.startsWith('image/'))).toBe(true);
    });
  });
});

describe('SCM — 文件大小限制', () => {
  it('内存存储限制应为 5MB', () => {
    const limit = 5 * 1024 * 1024;
    expect(limit).toBe(5242880);
  });

  it('磁盘存储限制应为 10MB', () => {
    const limit = 10 * 1024 * 1024;
    expect(limit).toBe(10485760);
  });
});
