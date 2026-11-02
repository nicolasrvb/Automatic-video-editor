// Preserve the working controls and their names while changing their hierarchy.
(()=>{
 const q=s=>document.querySelector(s),form=q('#edit-form'),cards=[...form.querySelectorAll('article')];
 const [source,edit,music,variants,director,delivery]=cards;
 document.body.classList.add('concept-b');q('.hero').remove();
 q('.brand').innerHTML='<b aria-hidden="true">▶</b> LocalCut';
 const navNames={workspace:'⌂  Home',history:'◷  History',connections:'⚙  Settings',polish:'▦  Storyboard',beats:'♫  Adjust to beats',audio:'♬  Audio studio',library:'▤  Source library',progress:'↗  Detailed progress'};
 const nav=q('nav');for(const key of ['workspace','history','polish','beats','audio','connections','library','progress']){const b=nav.querySelector('[data-tab="'+key+'"]');b.textContent=navNames[key];nav.append(b);}
 const tools=document.createElement('details');tools.className='nav-tools';tools.innerHTML='<summary>Editing tools</summary>';for(const key of ['polish','beats','audio','library','progress'])tools.append(nav.querySelector('[data-tab="'+key+'"]'));nav.append(nav.querySelector('[data-tab="connections"]'),tools);if(['polish','beats','audio','library','progress'].includes(location.hash.slice(1)))tools.open=true;
 q('header').innerHTML='<div><h1 id="ux-project-title">Create your next edit</h1><p id="ux-project-path">Choose footage to begin</p></div><span id="connection">Connecting…</span>';
 q('.disk').innerHTML='<span class="dot"></span>LOCAL WORKSPACE<p id="space">Checking storage…</p><small>Your originals stay in place.</small>';
 const columns=document.createElement('div');columns.className='ux-columns';form.prepend(columns);
 source.className='ux-source';source.querySelector('h2').textContent='Source folders';source.querySelector('.section-title>span').remove();
 source.insertAdjacentHTML('beforeend','<div id="ux-tree" class="folder-tree" aria-label="Source folders"></div>');
 const preview=document.createElement('article');preview.className='ux-preview';preview.innerHTML='<div class="card-heading"><h2>Selected footage</h2><span id="ux-source-count" class="badge">Choose a folder</span></div><div id="ux-preview-empty" class="preview-empty"><span aria-hidden="true">▻</span><strong>A story starts with a folder</strong><p>Select your footage on the left to see one representative preview.</p></div><video id="ux-source-player" controls preload="metadata" hidden></video><div id="ux-preview-caption"></div>';
 const settings=document.createElement('article');settings.className='ux-settings';settings.innerHTML='<h2> Edit settings</h2><div class="edit-mode" role="group" aria-label="Settings view"><button type="button" id="ux-auto" aria-pressed="true"><b>✦</b>Auto edit<small>Recommended</small></button><button type="button" id="ux-custom" aria-pressed="false"><b>⚙</b>Customize<small>More control</small></button></div><div id="ux-primary"></div><details id="ux-secondary"><summary>More edit options</summary><div class="detail-body"></div></details><details id="ux-advanced"><summary>Advanced settings</summary><div class="detail-body"></div></details>';
 columns.append(source,preview,settings);
 const label=name=>form.querySelector('[name="'+name+'"]').closest('label');
 const primary=settings.querySelector('#ux-primary');
 for(const name of ['name','preset','duration','orientation'])primary.append(label(name));
 label('name').childNodes[0].textContent='Project name';form.elements.name.placeholder='Name your edit (optional)';
 label('duration').childNodes[0].textContent='Length · seconds';
 primary.append(label('provider'));label('provider').childNodes[0].textContent='Analysis';
 const friendly={qwen3vl:'Standard · recommended',qwen:'Compatibility',qwen3:'Two-model analysis'};for(const o of form.elements.provider.options)o.textContent=friendly[o.value]||o.textContent;
 primary.insertAdjacentHTML('beforeend','<p class="hint">Runs locally on your PC. Model details are in Settings.</p>');
 const secondary=settings.querySelector('#ux-secondary .detail-body');
 for(const name of ['resolution','editor','grouping','ramps','slowMotion'])secondary.append(label(name));
 secondary.append(q('#custom-size'));secondary.append(label('instructions'));secondary.insertAdjacentHTML('beforeend','<details><summary>Project organization</summary><div class="detail-body"><label class="check"><input type="checkbox" name="prefixYYMM">Prefix project names with YYMM</label><p class="hint">Optional default for new edits, for example 2611_Bali_Trip.</p><label>Activity · optional<input name="activity" maxlength="120" placeholder="e.g. hiking"></label><label>Theme · optional<input name="theme" maxlength="120" placeholder="e.g. autumn weekend"></label></div></details>');
 const advanced=settings.querySelector('#ux-advanced .detail-body');advanced.append(edit,director,variants,delivery);
 // Name stays at the top; the existing submit button becomes the one primary action.
 const submit=delivery.querySelector('[type="submit"]');submit.innerHTML='Start edit <span aria-hidden="true">→</span>';submit.id='ux-start';settings.append(submit);
 for(const card of [edit,director,delivery]){const heading=card.querySelector('.section-title');if(heading)heading.remove();}
 // Keep every advanced input but remove empty layout wrappers left by the moves.
 form.querySelector(':scope > .grid').remove();
 const musicDialog=document.createElement('dialog');musicDialog.id='ux-music-dialog';musicDialog.innerHTML='<div class="card-heading"><h2>Choose music</h2><button type="button" id="ux-music-close" aria-label="Close music selection">✕</button></div>';
 // music belonged to the old grid, retain its live controls in the dialog.
 musicDialog.append(music);document.body.append(musicDialog);
 const musicBar=document.createElement('article');musicBar.className='ux-music-bar';musicBar.innerHTML='<div><h2>♫ Music selection</h2><div id="ux-music-summary"><strong>No music selected</strong><small>Choose a soundtrack or keep original sound</small></div></div><button type="button" id="ux-music-play" aria-label="Play selected music" disabled>▶</button><div class="wave-group"><svg id="ux-waveform" viewBox="0 0 360 56" role="img" aria-label="No waveform loaded"></svg><small id="ux-music-meta">Choose music to see its waveform</small></div><button type="button" id="ux-music-change">Change music</button>';
 form.append(musicBar);musicBar.append(music.querySelector('[name=musicOn]').closest('label'));musicBar.querySelector('label').classList.add('music-toggle');
 const audio=q('#music-preview');audio.hidden=true;musicBar.append(audio);
 music.querySelector('.section-title')?.remove();
 // Controls moved outside the form remain associated with it and submitted normally.
 for(const el of musicDialog.querySelectorAll('[name]'))el.setAttribute('form','edit-form');
 const footer=document.createElement('footer');footer.id='ux-footer';footer.setAttribute('aria-label','Edit progress');footer.innerHTML='<div class="footer-state"><span class="status-orb"></span><div><strong id="ux-work-name">Ready</strong><small id="ux-work-detail">Choose footage → Configure → Choose music → Start</small></div></div><div class="footer-meter" hidden><progress id="ux-work-progress" max="100" value="0" aria-label="Edit progress"></progress><span id="ux-work-percent"></span></div><div id="ux-work-queue"></div><div class="footer-actions"><button type="button" id="ux-work-pause" hidden>Pause</button><button type="button" id="ux-work-cancel" hidden>Cancel</button></div>';
 document.body.append(footer);
 q('#ux-music-change').onclick=()=>musicDialog.showModal();q('#ux-music-close').onclick=()=>musicDialog.close();
 q('#ux-auto').onclick=()=>{q('#ux-advanced').open=false;q('#ux-secondary').open=false;q('#ux-auto').setAttribute('aria-pressed','true');q('#ux-custom').setAttribute('aria-pressed','false');};
 q('#ux-custom').onclick=()=>{q('#ux-secondary').open=true;q('#ux-auto').setAttribute('aria-pressed','false');q('#ux-custom').setAttribute('aria-pressed','true');};
})();
