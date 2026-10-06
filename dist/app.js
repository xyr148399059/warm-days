const $=id=>document.getElementById(id);
const {parseDate,dateString,todayDay,nextPeriod,phaseFor,validate,calendar}=WarmDays;
const {suggestions,pairing}=WarmSuggestions;let selectedStage='pre';
const storageKey='warm-days-settings-v1';let settings=null;let storageAvailable=true;
const today=todayDay();$('last-period').max=dateString(today);
const shortDate=day=>new Intl.DateTimeFormat('zh-CN',{timeZone:'UTC',month:'long',day:'numeric'}).format(new Date(day*86400000));
$('today-label').textContent=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',weekday:'long'}).format(new Date())+' · 今天';
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&!validate(saved,today)){settings={duration:5,includeDuring:true,...saved};$('last-period').value=saved.last;$('cycle').value=saved.cycle;$('time').value=saved.time;$('duration').value=settings.duration;$('include-during').checked=settings.includeDuring;$('fruits').value=saved.fruits||'';}}catch{storageAvailable=false;}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(settings));storageAvailable=true;return true;}catch{storageAvailable=false;return false;}}
function render(){
  document.body.classList.toggle('configured',!!settings);
  selectedStage=settings&&phaseFor(settings,today).during?'during':'pre';renderSuggestions();
  $('seven-days').replaceChildren();
  if(!settings){for(let n=7;n>=1;n--){const cell=document.createElement('div');cell.className='day';cell.textContent='前 '+n+' 天';$('seven-days').append(cell);}return;}
  const next=nextPeriod(parseDate(settings.last),settings.cycle,today),remaining=next-today,start=next-7;
  const current=phaseFor(settings,today);
  $('phase').textContent=remaining===0?'预计经期日':remaining<=7?'经前关照进行中':'等待提醒开始';
  $('status-title').textContent=remaining===0?'记得更新实际来经日期':remaining<=7?'今天，饮料选常温的':'属于你的七天，已安排';
  $('status-copy').textContent=remaining===0?'预测日期到了。实际经期可能提前或推迟。':remaining<=7?'冰饮先放一放，水果按自己的感受选择。':shortDate(start)+'开始，每天给自己一个温柔提醒。';
  $('countdown').textContent=remaining;$('reminder-date').textContent=shortDate(start);$('period-date').textContent=shortDate(next);
  $('countdown-label').replaceChildren();$('countdown-label').append('天',document.createElement('br'),'距离预计经期');
  if(current.during){$('phase').textContent=(current.estimated?'预计经期中':'按记录处于经期中')+' · 第 '+current.day+' 天';$('status-title').textContent='吃点温热的，照顾好胃口';$('status-copy').textContent=current.estimated?'阶段按周期估算；实际来经后，请更新第一天。':'阶段按开始日期与持续天数估算；下方已切换到经期建议。';$('countdown').textContent=current.day;$('countdown-label').replaceChildren();$('countdown-label').append('天',document.createElement('br'),current.estimated?'本次预计经期':'本次已记录经期');}
  for(let n=7;n>=1;n--){const day=next-n,cell=document.createElement('div');cell.className='day'+(day===today?' is-today':day<today?' is-past':'');cell.setAttribute('aria-label',shortDate(day)+'，经前'+n+'天'+(day===today?'，今天':''));const date=document.createElement('span');date.textContent=new Date(day*86400000).getUTCDate()+'日';cell.append('前 '+n+' 天',date);$('seven-days').append(cell);}
  $('export').disabled=false;$('save-status').textContent=storageAvailable?'已保存到此设备 · 经期前 7 天提醒':'已应用本次设置，但浏览器未允许保存；关闭后需要重填。';
  $('export-status').textContent='日历提醒时间：每天 '+settings.time+'（北京时间）。导出后请导入日历。';
}
function renderSuggestions(){
  for(const stage of ['pre','during']){const active=stage===selectedStage;$('tab-'+stage).setAttribute('aria-selected',String(active));$('tab-'+stage).tabIndex=active?0:-1;}
  $('suggestion-panel').setAttribute('aria-labelledby','tab-'+selectedStage);
  $('stage-description').textContent=selectedStage==='pre'?'规律吃饭，选择舒服的温度；不需要提前大量进补。':'按自己的胃口选择，保持正常进食；汤食也要搭配主食和食材。';
  const current=settings?phaseFor(settings,today):null;const next=settings?nextPeriod(parseDate(settings.last),settings.cycle,today):null;const index=current&&selectedStage==='during'&&current.during?current.day-1:next&&selectedStage==='pre'&&next-today<=7?7-(next-today):0;
  $('pairing-label').textContent=(selectedStage==='pre'?'经前':'经期')+' · 一份可选搭配';$('daily-pairing').textContent=pairing(selectedStage,index,$('fruits').value.trim()).join(' · ');
  $('suggestion-grid').replaceChildren();
  for(const [group,label,kicker] of [['drinks','喝什么','饮料 / 5 种'],['soups','吃点汤食','汤与粥 / 5 种'],['fruits','水果怎么选','水果 / 5 种']]){
    const section=document.createElement('section');section.className='suggestion-category';const small=document.createElement('p');small.className='suggestion-kicker';small.textContent=kicker;const h=document.createElement('h3');h.textContent=label;section.append(small,h);
    for(const item of suggestions[group]){const excluded=group==='fruits'&&item.name.split(' / ').some(name=>$('fruits').value.includes(name));const details=document.createElement('details');details.className='suggestion-item';const summary=document.createElement('summary');summary.textContent=item.name+(excluded?' · 在你的少吃清单中':'');const intro=document.createElement('p');intro.className='suggestion-intro';intro.textContent=excluded?'可跳过这项，选择其他自己耐受的水果。':item[selectedStage];const recipe=document.createElement('p');recipe.textContent=item.recipe;const note=document.createElement('p');note.className='recipe-note';note.textContent=item.note;details.append(summary,intro,recipe,note);section.append(details);} $('suggestion-grid').append(section);
  }
}
for(const stage of ['pre','during']){
  $('tab-'+stage).addEventListener('click',()=>{selectedStage=stage;renderSuggestions();});
  $('tab-'+stage).addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();selectedStage=event.key==='Home'?'pre':event.key==='End'?'during':selectedStage==='pre'?'during':'pre';renderSuggestions();$('tab-'+selectedStage).focus();}});
}
$('settings-form').addEventListener('submit',event=>{event.preventDefault();const data={last:$('last-period').value,cycle:Number($('cycle').value),duration:Number($('duration').value),includeDuring:$('include-during').checked,time:$('time').value,fruits:$('fruits').value.trim()};const error=validate(data,today);if(error){$('save-status').textContent=error;return;}settings=data;persist();render();});
for(const id of ['last-period','cycle','time','duration'])$(id).addEventListener('input',()=>{$('export').disabled=true;$('save-status').textContent='设置有修改，请保存后再导出提醒。';});
$('include-during').addEventListener('change',()=>{if(settings){settings.includeDuring=$('include-during').checked;persist();}});
$('fruits').addEventListener('change',()=>{if(settings){settings.fruits=$('fruits').value.trim();persist();$('save-status').textContent=storageAvailable?'水果清单已保存到此设备':'清单已应用，但浏览器未允许保存。';}renderSuggestions();});
$('export').addEventListener('click',()=>{if(!settings)return;settings.fruits=$('fruits').value.trim();settings.includeDuring=$('include-during').checked;persist();const result=calendar(settings,todayDay());const url=URL.createObjectURL(new Blob([result.text],{type:'text/calendar;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='暖期-经前与经期提醒.ics';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);$('export-status').textContent=`已生成 ${result.count} 条未来提醒（经前 ${result.preCount} 条、经期 ${result.duringCount} 条）。打开下载的文件导入日历，确认提醒已开启。`;});
$('clear').addEventListener('click',()=>{if(settings||$('last-period').value)$('clear-dialog').showModal();else $('save-status').textContent='还没有需要清除的记录。';});
$('cancel-clear').addEventListener('click',()=>$('clear-dialog').close());
$('confirm-clear').addEventListener('click',()=>{try{localStorage.removeItem(storageKey);}catch{$('clear-dialog').close();$('save-status').textContent='浏览器未允许清除记录，请在浏览器设置中清除此网站的数据。';return;}location.reload();});
render();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&todayDay()!==today)location.reload();});
setInterval(()=>{if(todayDay()!==today)location.reload();},60000);
