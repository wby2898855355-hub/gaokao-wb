import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { regions } from '../utils/regions';
import { generateScoreBrackets } from '../utils/scores';
import './Home.css';

const currentYear = new Date().getFullYear();
const years = [];
for (let y = currentYear; y >= 1980; y--) {
  years.push(y);
}

const scoreBrackets = generateScoreBrackets();

export default function Home() {
  const navigate = useNavigate();
  const [year, setYear] = useState('');
  const [regionIdx, setRegionIdx] = useState('');
  const [subject, setSubject] = useState(''); // '1' = 文(历史), '2' = 理(物理)
  const [score, setScore] = useState('');
  const [errors, setErrors] = useState({});

  const handleEnter = () => {
    const newErrors = {};
    if (!year) newErrors.year = '请选择年份';
    if (!regionIdx && regionIdx !== 0) newErrors.region = '请选择地区';
    if (!subject) newErrors.subject = '请选择选科';
    if (!score) newErrors.score = '请选择分数段';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    // forumKey: year_regionIdx_subject_scoreRange
    const forumKey = `${year}_${regionIdx}_${subject}_${score}`;
    navigate(`/forum/${encodeURIComponent(forumKey)}`);
  };

  return (
    <div className="home">
      <div className="hero">
        <h1 className="hero-title">未选择的路</h1>
        <p className="hero-subtitle">与你高考分数相同的人，对一对人生剧本</p>
      </div>

      <div className="container">
        <div className="poem-section card">
          <blockquote>
            <p>也许多年后在某个地方，</p>
            <p>我将轻声叹息将往事回顾：</p>
            <p>一片树林里分出两条路——</p>
            <p>而我选择了人迹更少的一条，</p>
            <p>从此决定了我一生的道路。</p>
          </blockquote>
          <cite>—— 罗伯特·弗罗斯特《未选择的路》</cite>
        </div>

        <div className="form-section card">
          <h2 className="form-title">选择你的高考参数</h2>

          <div className="form-row">
            <div className="form-group">
              <label>高考年份</label>
              <select value={year} onChange={e => setYear(e.target.value)} className={errors.year ? 'has-error' : ''}>
                <option value="">请选择年份</option>
                {years.map(y => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
              </select>
              {errors.year && <span className="error-msg">{errors.year}</span>}
            </div>

            <div className="form-group">
              <label>高考地区</label>
              <select value={regionIdx} onChange={e => setRegionIdx(e.target.value)} className={errors.region ? 'has-error' : ''}>
                <option value="">请选择地区</option>
                {regions.map((r, i) => (
                  <option key={i} value={i}>{r}</option>
                ))}
              </select>
              {errors.region && <span className="error-msg">{errors.region}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>高考选科</label>
            <div className="subject-options">
              <label className={`subject-option ${subject === '1' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="subject"
                  value="1"
                  checked={subject === '1'}
                  onChange={e => setSubject(e.target.value)}
                />
                <span>文科（历史类）</span>
              </label>
              <label className={`subject-option ${subject === '2' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="subject"
                  value="2"
                  checked={subject === '2'}
                  onChange={e => setSubject(e.target.value)}
                />
                <span>理科（物理类）</span>
              </label>
            </div>
            {errors.subject && <span className="error-msg">{errors.subject}</span>}
          </div>

          <div className="form-group">
            <label>高考分数段</label>
            <select value={score} onChange={e => setScore(e.target.value)} className={errors.score ? 'has-error' : ''}>
              <option value="">请选择分数段</option>
              {scoreBrackets.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
            {errors.score && <span className="error-msg">{errors.score}</span>}
          </div>

          <button className="btn-primary btn-enter" onClick={handleEnter}>
            进入论坛
          </button>
        </div>
      </div>
    </div>
  );
}
