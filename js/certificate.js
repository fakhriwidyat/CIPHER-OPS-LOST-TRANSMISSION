/* The same printable SVG is shown in the debrief and downloaded as a file. */
(function (root) {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const fmtDate = date => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(date));
  function svg({ name, records, completedAt, team = false }) {
    const cleanName = esc(name);
    const total = records.reduce((sum, r) => sum + r.score, 0);
    const mode = team ? 'SKOR TIM' : 'SKOR AKHIR';
    const size = Math.min(47, 1000 / Math.max(name.length, 1));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620" role="img" aria-label="Sertifikat lulus ${cleanName}, ${total} dari 300 poin">
      <rect width="1000" height="620" fill="#f1f5f1"/>
      <path fill="#11283a" d="M0 0h1000v112H0zM0 564h1000v56H0z"/>
      <path fill="none" stroke="#52877e" stroke-width="2" d="M25 24h950v572H25zM57 138h886v397H57z"/>
      <path fill="#dcf5ed" d="M67 49h14v-9h10v9h14v10H91v14H81V59H67z"/>
      <g font-family="monospace" fill="#d6efeb">
        <text x="126" y="62" font-size="23" font-weight="bold">CIPHER OPS</text>
        <text x="126" y="84" font-size="13" letter-spacing="3">LOST TRANSMISSION</text>
        <text x="928" y="65" font-size="14" text-anchor="end" letter-spacing="2">ARSIP OPERATOR / 02</text>
        <text x="500" y="590" font-size="15" text-anchor="middle" letter-spacing="2">NOVARIS FIELD OPERATIONS</text>
      </g>
      <g font-family="system-ui,sans-serif" fill="#152b3b" text-anchor="middle">
        <text x="500" y="198" font-size="38" font-weight="bold">Sertifikat Lulus</text>
        <text x="500" y="235" font-size="17">Diberikan kepada</text>
        <text x="500" y="292" font-size="${size}" font-weight="bold">${cleanName}</text>
        <text x="500" y="331" font-size="17">Menyelesaikan dua peta dan empat topik matematika</text>
        <text x="500" y="358" font-size="16">Fungsi · Nonfungsi · Invers · Cipher</text>
        <path fill="#dbece7" d="M121 388h758v83H121z"/>
        <path stroke="#aec8c0" d="M373 402v55m254-55v55"/>
        ${[...records.map(r => [r.name.toUpperCase(), r.score + ' / 150']), [mode, total + ' / 300']].map(([label, points], i) => `<text x="${247 + i * 253}" y="417" font-size="13" letter-spacing="2">${esc(label)}</text><text x="${247 + i * 253}" y="449" font-size="26" font-weight="bold">${esc(points)}</text>`).join('')}
        <text x="500" y="510" font-size="16">Selesai ${esc(fmtDate(completedAt))}</text>
      </g>
    </svg>`;
  }
  function card(report) {
    const art = svg(report);
    const filename = report.name.replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 40);
    return `<div class="certificate-card">${art}<a class="button primary" download="sertifikat-cipher-ops-${filename}.svg" href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(art)}">Unduh sertifikat SVG ↓</a></div>`;
  }
  const api = { svg, card };
  root.CipherCertificate = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
