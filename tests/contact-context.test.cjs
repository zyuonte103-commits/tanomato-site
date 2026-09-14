const {test} = require('node:test');
const assert = require('node:assert/strict');
const {fromSearch,googleUrl} = require('../contact-context.js');
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
test('only a published Google Form URL is accepted and unrelated URL parameters are dropped',()=>{
  const context=fromSearch('?service=企業サイト&sample=NORTHLINE');
  const config={googleFormUrl:'https://docs.google.com/forms/d/e/testFormID/viewform?untrusted=secret#hash',googleServiceEntry:'entry.123',googleMessageEntry:'entry.456'};
  const u=new URL(googleUrl(config,context,true));
  assert.equal(u.searchParams.get('entry.123'),'企業サイト');assert.equal(u.searchParams.get('entry.456'),'参考制作例：NORTHLINE');assert.equal(u.searchParams.get('embedded'),'true');assert.equal(u.searchParams.has('untrusted'),false);assert.equal(u.hash,'');
  for (const url of ['', 'javascript:alert(1)','https://evil.example/forms/d/e/x/viewform','https://docs.google.com.evil.example/forms/d/e/x/viewform','https://docs.google.com/forms/d/e/x/edit','http://docs.google.com/forms/d/e/x/viewform']) assert.equal(googleUrl({...config,googleFormUrl:url},context),'');
});
