(() => {
 const $=s=>document.querySelector(s);let submissions=[];
 function t(s){return document.createTextNode(String(s??''));}
 $('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();$('#message').textContent='Loading…';
  try{
   const res=await fetch('/api/rsvps',{headers:{Authorization:`Bearer ${$('#token').value}`}});
   const data=await res.json();if(!res.ok)throw Error(data.error||`HTTP ${res.status}`);
   submissions=data.rsvps||[];$('#message').textContent=`${submissions.length} guest responses loaded`;
   $('#csv').hidden=submissions.length===0;
   const panel=$('#results');panel.replaceChildren();
   if(!submissions.length){const p=document.createElement('p');p.className='empty muted';p.textContent='No RSVPs yet.';panel.append(p);return;}
   const table=document.createElement('table');const thead=document.createElement('thead');const hdr=document.createElement('tr');
   ['Name','Phone','Guests','Events','Wishes','Submitted'].forEach(label=>{let th=document.createElement('th');th.textContent=label;hdr.append(th);});thead.append(hdr);table.append(thead);
   const tbody=document.createElement('tbody');
   submissions.forEach(r=>{const tr=document.createElement('tr');const vals=[r.name,r.phone,r.guestCount,(r.responses||[]).map(x=>`${x.event}: ${x.response}`).join(' | '),r.message,new Date(r.submittedAt).toLocaleString()];vals.forEach(v=>{let td=document.createElement('td');td.append(t(v));tr.append(td);});tbody.append(tr);});
   table.append(tbody);panel.append(table);
  }catch(err){$('#message').textContent=err.message;$('#csv').hidden=true;}
 });
 $('#csv').addEventListener('click',()=>{
  const rows=[['Name','Phone','Guests','Events','Wishes','Submitted'],...submissions.map(r=>[r.name,r.phone,r.guestCount,(r.responses||[]).map(x=>`${x.event}:${x.response}`).join('; '),r.message,r.submittedAt])];
  const csv=rows.map(row=>row.map(s=>`"${String(s??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='wedding-rsvps.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
})();
