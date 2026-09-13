const motionOK=!matchMedia('(prefers-reduced-motion: reduce)').matches;
if(motionOK && 'IntersectionObserver' in window){
 const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.08});
 document.documentElement.classList.add('js-motion');
 document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}
const control=document.createElement('button');control.className='motion-control';control.textContent='動きを停止';control.setAttribute('aria-pressed','false');document.querySelector('.footer').append(control);
control.addEventListener('click',()=>{const paused=document.body.classList.toggle('paused');control.textContent=paused?'動きを再開':'動きを停止';control.setAttribute('aria-pressed',String(paused));});
