const {test} = require('node:test');
const assert = require('node:assert/strict');
const {fromSearch} = require('../contact-context.js');
test('corporate links preserve service and sample; unknown inputs are ignored',()=>{
  assert.equal(fromSearch('?service=企業サイト').service,'企業サイト');
  assert.equal(fromSearch('?sample=NORTHLINE').service,'企業サイト');
  assert.equal(fromSearch('?sample=発信ラボ').service,'LP制作');
  assert.equal(fromSearch('?sample=部分修正・デザイン').service,'サイト修正とデザイン制作');
  assert.deepEqual(fromSearch('?sample=<script>&service=wrong&industry=secret&plan=untrusted'),{service:'まだ決まっていない',sample:'',industry:'',plan:'',message:''});
  assert.equal(fromSearch('?sample=__proto__').sample,'');
});
test('explicit valid service overrides sample suggestion, preserving known context',()=>{
  const c=fromSearch('?sample=余白珈琲&service=更新・運用&industry=カフェ・飲食店');
  assert.equal(c.service,'更新・運用');assert.match(c.message,/参考制作例：余白珈琲/);assert.match(c.message,/業種：カフェ・飲食店/);
});
