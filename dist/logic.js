/* Calendar dates use UTC day numbers; reminder times use Asia/Shanghai. */
(function(root){
  const DAY=86400000;
  function parseDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return NaN;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?date.getTime()/DAY:NaN;}
  function dateString(day){return new Date(day*DAY).toISOString().slice(0,10);}
  function todayDay(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(p=>p.type===t).value;return parseDate(`${get('year')}-${get('month')}-${get('day')}`);}
  function nextPeriod(last,cycle,today){return last+Math.max(1,Math.ceil((today-last)/cycle))*cycle;}
  function phaseFor(data,today){const last=parseDate(data.last),cycles=Math.floor((today-last)/data.cycle),start=last+cycles*data.cycle,day=today-start+1;return {during:day<=(data.duration??5),day,start,estimated:cycles>0};}
  function validate(data,today){const last=parseDate(data.last);if(!Number.isFinite(last)||last>today)return '请选择今天或更早的有效经期日期。';if(!Number.isInteger(data.cycle)||data.cycle<15||data.cycle>90)return '周期请输入 15–90 之间的整数天数。';if(!Number.isInteger(data.duration??5)||(data.duration??5)<1||(data.duration??5)>14)return '持续天数请输入 1–14 之间的整数。';if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time))return '请选择有效的提醒时间。';return '';}
  function escapeICS(value){return String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
  function foldLine(line){let out='',bytes=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){out+='\r\n ';bytes=1;}out+=char;bytes+=size;}return out;}
  function calendar(data,today,now=Date.now()){
    const error=validate(data,today);if(error)throw new Error(error);
    const last=parseDate(data.last),next=nextPeriod(last,data.cycle,today);const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Warm Days//Cycle Reminders//ZH','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:暖期 · 经前与经期提醒'];let count=0,preCount=0,duringCount=0;
    const stamp=new Date(now).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    function addEvent(day,stage,index,period){const datetime=new Date(dateString(day)+'T'+data.time+':00+08:00');if(datetime.getTime()<=now)return;if(stage==='pre'&&data.includeDuring&&phaseFor(data,day).during)return;const dt=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
      const pairing=root.WarmSuggestions?root.WarmSuggestions.pairing(stage,index,data.fruits||'').join(' · '):'温水 · 清淡正餐 · 按耐受选择水果';
      const summary=stage==='pre'?'暖期：不喝冰饮，今天吃喝有建议':'暖期：预计经期中的饮食关照';
      const description=(stage==='pre'?`距离预计经期还有 ${7-index} 天。`:`按记录或预测，这是经期第 ${index+1} 天。`)+`今天的可选搭配：${pairing}。任选喜欢的一项，不必全部吃。按个人习惯避开冰饮。${data.fruits?'按个人习惯暂时少吃：'+data.fruits+'。':'水果按自己的感受选择，无需一概禁食。'}淡姜茶如引起烧心可跳过，榴莲少量食用。${stage==='pre'?'预计经期':'本次记录或预计开始日期'}：${dateString(period)}。阶段与日期为估算，实际来经后请更新。饮食建议不保证缓解痛经；不适明显或疼痛加重请就医。`;
      lines.push('BEGIN:VEVENT',`UID:warm-${dateString(last)}-${data.cycle}-${dateString(day)}-${data.time.replace(':','')}@warm-days.local`,`DTSTAMP:${stamp}`,`DTSTART:${dt(datetime)}`,`DTEND:${dt(new Date(datetime.getTime()+10*60000))}`,`SUMMARY:${escapeICS(summary)}`,`DESCRIPTION:${escapeICS(description)}`,'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY',`DESCRIPTION:${escapeICS(summary)}`,'END:VALARM','END:VEVENT');count++;
      if(stage==='pre')preCount++;else duringCount++;
    }
    for(let c=0;c<3;c++){const period=next+c*data.cycle;for(let index=0;index<7;index++)addEvent(period-7+index,'pre',index,period);if(data.includeDuring)for(let index=0;index<(data.duration??5);index++)addEvent(period+index,'during',index,period);}
    const phase=phaseFor(data,today);if(data.includeDuring&&phase.during&&phase.start<next)for(let index=phase.day-1;index<(data.duration??5);index++)addEvent(phase.start+index,'during',index,phase.start);
    lines.push('END:VCALENDAR');return {text:lines.map(foldLine).join('\r\n')+'\r\n',count,preCount,duringCount};
  }
  root.WarmDays={parseDate,dateString,todayDay,nextPeriod,phaseFor,validate,calendar};
})(typeof window!=='undefined'?window:globalThis);
