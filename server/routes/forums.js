import { Router } from 'express';
import { queryOne } from '../db.js';

const router = Router();

// Parse forum key and return human-readable info
function parseForumKey(key) {
  // Format: year_regionIndex_subject_scoreRange
  const parts = key.split('_');
  if (parts.length < 4) return null;

  const regions = [
    '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
    '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
    '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
    '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'
  ];

  return {
    year: parts[0],
    region: regions[parseInt(parts[1])] || '未知',
    subject: parts[2] === '1' ? '文科(历史类)' : '理科(物理类)',
    scoreRange: parts.slice(3).join('_')
  };
}

router.get('/forums/:forumKey/info', (req, res) => {
  const info = parseForumKey(req.params.forumKey);
  if (!info) {
    return res.status(400).json({ error: '无效的论坛参数' });
  }
  res.json(info);
});

export default router;
