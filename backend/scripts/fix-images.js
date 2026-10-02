const fs = require('fs');
const f = 'C:/ojawa/backend/scripts/seed50Products.js';
let s = fs.readFileSync(f, 'utf8');

const pool = [
  '1517336714731-489689fd1ca8','1496181133206-80ce9b88a853','1696446701792-9c2a0422db95',
  '1610945265068-4b8f5a0baf5f','1511707171634-5f897ff02aa9','1505740420928-5e560c06d30e',
  '1484704849701-fc2e96f4510c','1608049427017-25f898e58a63','1544244015-0df4b3d15e1f',
  '1585790050230-5f3709e6a1f2','1527864556-7f3b5e0c6e6d','1587829741301-dac430f389e7',
  '1597872208105-2f0f4a700000','1558317374-067fb5f30001','1518770660439-4636190f1b95',
  '1547394765-0e27f3e7c8f7','1593642632829-5a0e2f6b5f14','1550751827-4bd3f4f0e5a1',
  '1523206485973-5d1d3372743c','1535378437323-27168482b3b6'
];

const newFn = `const pool = ${JSON.stringify(pool)};
let imgIdx = 0;
const nextImg = () => {
  const id = pool[imgIdx % pool.length];
  imgIdx++;
  return "https://images.unsplash.com/photo-" + id + "?w=600&auto=format&fit=crop&q=80";
};`;

s = s.replace(/const u = \(id\) => `https:\/\/images\.unsplash\.com\/photo-\$\{id\}\?w=600&auto=format&fit=crop&q=80`;/, newFn);
s = s.replace(/u\('[^']+'\)/g, 'nextImg()');

fs.writeFileSync(f, s);
console.log('Fixed ' + (s.match(/nextImg\(\)/g) || []).length + ' image calls');
