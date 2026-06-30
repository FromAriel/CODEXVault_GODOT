var ft=Object.defineProperty;var ht=(t,e,s)=>e in t?ft(t,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[e]=s;var qe=(t,e,s)=>ht(t,typeof e!="symbol"?e+"":e,s);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const l of n.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&a(l)}).observe(document,{childList:!0,subtree:!0});function s(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function a(i){if(i.ep)return;i.ep=!0;const n=s(i);fetch(i.href,n)}})();const gt="modulepreload",bt=function(t,e){return new URL(t,e).href},Ee={},vt=function(e,s,a){let i=Promise.resolve();if(s&&s.length>0){const l=document.getElementsByTagName("link"),r=document.querySelector("meta[property=csp-nonce]"),c=(r==null?void 0:r.nonce)||(r==null?void 0:r.getAttribute("nonce"));i=Promise.allSettled(s.map(m=>{if(m=bt(m,a),m in Ee)return;Ee[m]=!0;const h=m.endsWith(".css"),q=h?'[rel="stylesheet"]':"";if(!!a)for(let I=l.length-1;I>=0;I--){const S=l[I];if(S.href===m&&(!h||S.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${m}"]${q}`))return;const g=document.createElement("link");if(g.rel=h?"stylesheet":gt,h||(g.as="script"),g.crossOrigin="",g.href=m,c&&g.setAttribute("nonce",c),document.head.appendChild(g),h)return new Promise((I,S)=>{g.addEventListener("load",I),g.addEventListener("error",()=>S(new Error(`Unable to preload CSS for ${m}`)))})}))}function n(l){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=l,window.dispatchEvent(r),!r.defaultPrevented)throw l}return i.then(l=>{for(const r of l||[])r.status==="rejected"&&n(r.reason);return e().catch(n)})},Es="sentinel.demo.current",yt=async()=>{{const{DemoWorkbenchBackend:t}=await vt(async()=>{const{DemoWorkbenchBackend:e}=await import("./demo-backend-BECvGcHl.js");return{DemoWorkbenchBackend:e}},[],import.meta.url);return new t}},St={"x02-mecha-arms-isolated-black-5x4-sheet-cutout.png":new URL(""+new URL("x02-mecha-arms-isolated-black-5x4-sheet-cutout-BhyxXqeI.png",import.meta.url).href,import.meta.url).href,"x04-mecha-legs-tall-isolated-black-4x5-sheet-cutout.png":new URL(""+new URL("x04-mecha-legs-tall-isolated-black-4x5-sheet-cutout-Dfj9AmNf.png",import.meta.url).href,import.meta.url).href,"x05-mecha-heads-isolated-black-1x1-sheet-cutout.png":new URL(""+new URL("x05-mecha-heads-isolated-black-1x1-sheet-cutout-DW569Pdv.png",import.meta.url).href,import.meta.url).href,"x06-light-mecha-legs-4x5-sheet-cutout.png":new URL(""+new URL("x06-light-mecha-legs-4x5-sheet-cutout-ovmXiJTJ.png",import.meta.url).href,import.meta.url).href,"x07-heavy-mecha-legs-4x5-sheet-cutout.png":new URL(""+new URL("x07-heavy-mecha-legs-4x5-sheet-cutout-BVsnb6VG.png",import.meta.url).href,import.meta.url).href,"x08-light-mecha-arms-5x4-sheet-cutout.png":new URL(""+new URL("x08-light-mecha-arms-5x4-sheet-cutout-BqY6bGzn.png",import.meta.url).href,import.meta.url).href,"x09-heavy-mecha-arms-5x4-sheet-cutout.png":new URL(""+new URL("x09-heavy-mecha-arms-5x4-sheet-cutout-D_PUa7Gg.png",import.meta.url).href,import.meta.url).href,"x11-normal-mecha-bodies-5x4-sheet-cutout.png":new URL(""+new URL("x11-normal-mecha-bodies-5x4-sheet-cutout-DShSLN79.png",import.meta.url).href,import.meta.url).href,"x12-light-mecha-bodies-5x4-sheet-cutout.png":new URL(""+new URL("x12-light-mecha-bodies-5x4-sheet-cutout-U7lT4DLW.png",import.meta.url).href,import.meta.url).href,"x13-heavy-mecha-bodies-5x4-sheet-cutout.png":new URL(""+new URL("x13-heavy-mecha-bodies-5x4-sheet-cutout-sfu1NXho.png",import.meta.url).href,import.meta.url).href,"x14-generic-central-cores-5x4-sheet-cutout.png":new URL(""+new URL("x14-generic-central-cores-5x4-sheet-cutout-BOKc4VPP.png",import.meta.url).href,import.meta.url).href},_=t=>St[t],v=16,X=["light","medium","heavy","generic"],wt={light:"Light",medium:"Medium",heavy:"Heavy",generic:"Generic"},Be=["Industrial","Sensor Pod","Predator","Cute","Heroic","Steampunk","Utility","Skeletal","Damaged","Salvage","Sleek","Hazard","Commander","Dieselpunk","Racing","Asymmetric"],pe=[{id:"head.generic.x05",kind:"head",weight:"generic",label:"Heads",filename:"x05-mecha-heads-isolated-black-1x1-sheet-cutout.png",url:_("x05-mecha-heads-isolated-black-1x1-sheet-cutout.png"),frameCount:v,frameWidth:313,frameHeight:311},{id:"core.medium.x11",kind:"core",weight:"medium",label:"Normal Bodies",filename:"x11-normal-mecha-bodies-5x4-sheet-cutout.png",url:_("x11-normal-mecha-bodies-5x4-sheet-cutout.png"),frameCount:v,frameWidth:348,frameHeight:278},{id:"core.light.x12",kind:"core",weight:"light",label:"Light Bodies",filename:"x12-light-mecha-bodies-5x4-sheet-cutout.png",url:_("x12-light-mecha-bodies-5x4-sheet-cutout.png"),frameCount:v,frameWidth:350,frameHeight:273},{id:"core.heavy.x13",kind:"core",weight:"heavy",label:"Heavy Bodies",filename:"x13-heavy-mecha-bodies-5x4-sheet-cutout.png",url:_("x13-heavy-mecha-bodies-5x4-sheet-cutout.png"),frameCount:v,frameWidth:346,frameHeight:275},{id:"core.generic.x14",kind:"core",weight:"generic",label:"Central Cores",filename:"x14-generic-central-cores-5x4-sheet-cutout.png",url:_("x14-generic-central-cores-5x4-sheet-cutout.png"),frameCount:v,frameWidth:350,frameHeight:275},{id:"arm.medium.x02",kind:"arm",weight:"medium",label:"Normal Arms",filename:"x02-mecha-arms-isolated-black-5x4-sheet-cutout.png",url:_("x02-mecha-arms-isolated-black-5x4-sheet-cutout.png"),frameCount:v,frameWidth:347,frameHeight:280},{id:"arm.light.x08",kind:"arm",weight:"light",label:"Light Arms",filename:"x08-light-mecha-arms-5x4-sheet-cutout.png",url:_("x08-light-mecha-arms-5x4-sheet-cutout.png"),frameCount:v,frameWidth:349,frameHeight:278},{id:"arm.heavy.x09",kind:"arm",weight:"heavy",label:"Heavy Arms",filename:"x09-heavy-mecha-arms-5x4-sheet-cutout.png",url:_("x09-heavy-mecha-arms-5x4-sheet-cutout.png"),frameCount:v,frameWidth:349,frameHeight:277},{id:"leg.medium.x04",kind:"leg",weight:"medium",label:"Normal Legs",filename:"x04-mecha-legs-tall-isolated-black-4x5-sheet-cutout.png",url:_("x04-mecha-legs-tall-isolated-black-4x5-sheet-cutout.png"),frameCount:v,frameWidth:270,frameHeight:347},{id:"leg.light.x06",kind:"leg",weight:"light",label:"Light Legs",filename:"x06-light-mecha-legs-4x5-sheet-cutout.png",url:_("x06-light-mecha-legs-4x5-sheet-cutout.png"),frameCount:v,frameWidth:244,frameHeight:388},{id:"leg.heavy.x07",kind:"leg",weight:"heavy",label:"Heavy Legs",filename:"x07-heavy-mecha-legs-4x5-sheet-cutout.png",url:_("x07-heavy-mecha-legs-4x5-sheet-cutout.png"),frameCount:v,frameWidth:246,frameHeight:386}],Te=()=>({activeSlotId:"core",activeWeight:"medium",selections:{}}),M=t=>{const e=t??"";return e==="head"?"head":e.includes("arm")?"arm":e.includes("leg")?"leg":"core"},It=t=>t.includes("right_"),fe=t=>pe.filter(e=>e.kind===t).sort((e,s)=>X.indexOf(e.weight)-X.indexOf(s.weight)),_t=t=>fe(t).map(e=>e.weight),N=(t,e)=>pe.find(s=>s.kind===t&&s.weight===e),We=t=>Number.isFinite(t)?Math.max(0,Math.min(v-1,Math.trunc(t))):0,Y=(t,e)=>{var s;return e&&N(t,e)?e:N(t,"medium")?"medium":((s=fe(t)[0])==null?void 0:s.weight)??"generic"},Ve=(t,e)=>{const s=M(e),a=t.selections[e],i=Y(s,a==null?void 0:a.weight),n=N(s,i)??fe(s)[0]??pe[0],l=We((a==null?void 0:a.frameIndex)??0);return{slotId:e,kind:s,weight:n.weight,frameIndex:l,styleLabel:Be[l]??`Style ${l+1}`,sheet:n,mirrored:It(e)}},me=t=>[...t].sort((e,s)=>{const a=(e.code??"").localeCompare(s.code??"");if(a!==0)return a;const i=(e.entityId??"").localeCompare(s.entityId??"");if(i!==0)return i;const n=(e.path??"").localeCompare(s.path??"");if(n!==0)return n;const l=(e.field??"").localeCompare(s.field??"");return l!==0?l:(e.message??"").localeCompare(s.message??"")}),Ue=t=>[...t].sort((e,s)=>{const a=(e.kind??"").localeCompare(s.kind??"");return a!==0?a:(e.id??"").localeCompare(s.id??"")}),$t=t=>t?{packId:t.packId,entries:Ue(t.entries??[]),errors:me(t.errors??[]),warnings:me(t.warnings??[])}:null,Ps=t=>Ue(t),Rs=t=>me(t),ze=t=>({draft:t,selectedIndex:t.selectedSystems.length>0?0:void 0}),Fe=()=>({frameAssembly:{sizeClassId:"",weightClassId:"",bodyPlanId:"",modePlanId:""},selectedSystems:[]}),Oe=(t="sentinel.core")=>({packId:t,catalogEntries:[],draftState:ze(Fe()),artifacts:{},theme:"dark",workbenchMode:"api",visual:Te(),openDrawer:void 0,equipmentFilter:"all",equipmentShowAll:!1,equipmentSort:"name",equipmentQuery:""});class kt{constructor(e={}){qe(this,"_state");var i,n;const s=((i=e.draftState)==null?void 0:i.draft)??Fe(),a=e.draftState??ze(s);this._state={...Oe(),...e,draftState:a,catalogEntries:[...e.catalogEntries??[]],visual:{...e.visual??Te(),selections:{...((n=e.visual)==null?void 0:n.selections)??{}}}}}get state(){return this._state}setPackId(e){this._state={...this._state,packId:e}}setBuildSessionId(e){this._state={...this._state,buildSessionId:e}}setTheme(e){this._state={...this._state,theme:e}}setWorkbenchMode(e){this._state={...this._state,workbenchMode:e}}setSelectedZoneId(e){this._state={...this._state,selectedZoneId:e,selectedSlotId:void 0}}setSelectedSlotId(e){this._state={...this._state,selectedSlotId:e}}setActiveVisualSlot(e){const s=M(e),a=this._state.visual.selections[e];this._state={...this._state,visual:{...this._state.visual,activeSlotId:e,activeWeight:Y(s,(a==null?void 0:a.weight)??this._state.visual.activeWeight)}}}setVisualWeight(e){const s=M(this._state.visual.activeSlotId);this._state={...this._state,visual:{...this._state.visual,activeWeight:Y(s,e)}}}setVisualPart(e,s,a){const i=M(e);N(i,s)&&(this._state={...this._state,visual:{...this._state.visual,activeSlotId:e,activeWeight:s,selections:{...this._state.visual.selections,[e]:{weight:s,frameIndex:We(a)}}}})}setPreviewSystemId(e){this._state={...this._state,previewSystemId:e}}setEquipmentFilter(e){this._state={...this._state,equipmentFilter:e}}setEquipmentShowAll(e){this._state={...this._state,equipmentShowAll:e}}setEquipmentSort(e){this._state={...this._state,equipmentSort:e}}setEquipmentQuery(e){this._state={...this._state,equipmentQuery:e}}setOpenDrawer(e){this._state={...this._state,openDrawer:e}}toggleTheme(){const e=this._state.theme==="dark"?"light":"dark";this.setTheme(e)}setCatalogEntries(e){const s=e&&"data"in e?e.data:e,a=$t(s);if(!a){this._state={...this._state,catalogEntries:[]};return}this._state={...this._state,catalogEntries:a.entries,packId:a.packId}}setDraft(e){this._state={...this._state,draftState:{draft:{frameAssembly:{...e.frameAssembly},selectedSystems:[...e.selectedSystems]},selectedIndex:e.selectedSystems.length>0?0:void 0}}}setValidation(e){const s={...this._state.artifacts,validation:e};this._state={...this._state,artifacts:s,lastMessage:e!=null&&e.ok?"Compile validation complete.":"Compile validation found issues.",statusText:e?e.ok?"ok":"invalid":this._state.statusText}}setRuntime(e,s){this._state={...this._state,artifacts:{...this._state.artifacts,runtime:e},runtimeSessionId:s??this._state.runtimeSessionId,lastMessage:e?"Runtime state updated.":"Runtime state cleared.",statusText:e?"runtime":this._state.statusText}}setLastAction(e){this._state={...this._state,artifacts:{...this._state.artifacts,lastAction:e}}}setLastMessage(e){this._state={...this._state,lastMessage:e,statusText:e}}setFrameAssembly(e,s=!0){this.setDraft({frameAssembly:e,selectedSystems:s?[]:this._state.draftState.draft.selectedSystems}),this.setPreviewSystemId(void 0)}addSystem(){this._state={...this._state,draftState:{...this._state.draftState,draft:{...this._state.draftState.draft,selectedSystems:[...this._state.draftState.draft.selectedSystems,{locationId:"",slotId:void 0,emplacementId:void 0,weaponProfileId:void 0}]},selectedIndex:this._state.draftState.selectedIndex??0}}}updateSystem(e,s){const a=[...this._state.draftState.draft.selectedSystems],i=a[e];i&&(a[e]={...i,...s},this._state={...this._state,draftState:{...this._state.draftState,draft:{...this._state.draftState.draft,selectedSystems:a}}})}removeSystem(e){const s=[...this._state.draftState.draft.selectedSystems];s.splice(e,1),this._state={...this._state,draftState:{...this._state.draftState,draft:{...this._state.draftState.draft,selectedSystems:s},selectedIndex:s.length>0?0:void 0}}}}const he=new Set(["armor_profile","cockpit_system","defense_layer","missile_loadout","movement_system","power_plant","sensor_system","support_system","system_extra","weapon_profile"]),E=(t,e)=>t.id.localeCompare(e.id),f=t=>typeof t=="string"&&t.length>0?t:void 0,C=t=>t&&typeof t=="object"&&!Array.isArray(t)?t:void 0,xt=t=>{const e=C(t),s=f(e==null?void 0:e.id),a=f(e==null?void 0:e.type);return!s||!a?null:{id:s,type:a,count:typeof(e==null?void 0:e.count)=="number"?e.count:1}},Me=t=>{const e=C(t),s=f(e==null?void 0:e.id),a=f(e==null?void 0:e.type);return!s||!a?null:{id:s,type:a,count:typeof(e==null?void 0:e.count)=="number"?e.count:void 0,slots:Array.isArray(e==null?void 0:e.slots)?e.slots.map(xt).filter(i=>i!==null):[]}},V=(t,e)=>t.filter(s=>s.kind===e).sort((s,a)=>(s.id??"").localeCompare(a.id??"")),x=t=>f(t==null?void 0:t.name)??f(t==null?void 0:t.id)??"(unnamed)",Lt=t=>t.draftState.draft.frameAssembly,At=t=>{const e=f(Lt(t).bodyPlanId);return t.catalogEntries.find(s=>s.kind==="body_plan"&&s.id===e)},ce=(t,e)=>`${t} ${e}${t===1?"":"s"}`,Ct=t=>{if(!t)return;const e=Array.isArray(t.locations)?t.locations.map(Me).filter(l=>l!==null):[],s=l=>e.filter(r=>r.id.includes(l)||r.type.includes(l)).reduce((r,c)=>r+(c.count??1),0),a=s("core"),i=s("arm"),n=s("leg");return`${ce(a,"core")}, ${ce(i,"arm")}, ${ce(n,"leg")}`},se=t=>{const e=At(t);return(Array.isArray(e==null?void 0:e.locations)?e.locations:[]).map(Me).filter(a=>a!==null)},ge=t=>V(t.catalogEntries,"body_plan").map(e=>({id:e.id??"",label:x(e),detail:Ct(e)})).filter(e=>e.id.length>0).sort(E),Ne=t=>V(t.catalogEntries,"frame_size_class").map(e=>({id:e.id??"",label:x(e),detail:f(e.identity)??f(e.scale)})).filter(e=>e.id.length>0).sort(E),He=t=>V(t.catalogEntries,"frame_weight_class").map(e=>({id:e.id??"",label:x(e),detail:f(e.identity)})).filter(e=>e.id.length>0).sort(E),je=t=>V(t.catalogEntries,"mode_plan").map(e=>({id:e.id??"",label:x(e),detail:f(e.identity)})).filter(e=>e.id.length>0).sort(E),Ze=t=>V(t.catalogEntries,"frame_preset").map(e=>{const s=C(e.assembly),a=t.catalogEntries.find(i=>i.id===(s==null?void 0:s.bodyPlanId));return{id:e.id??"",label:x(e),detail:[x(a),f(s==null?void 0:s.sizeClassId),f(s==null?void 0:s.weightClassId)].filter(Boolean).join(" | ")}}).filter(e=>e.id.length>0).sort(E),be=(t,e)=>{const s=t.catalogEntries.find(c=>c.kind==="frame_preset"&&c.id===e),a=C(s==null?void 0:s.assembly),i=f(a==null?void 0:a.sizeClassId),n=f(a==null?void 0:a.weightClassId),l=f(a==null?void 0:a.bodyPlanId),r=f(a==null?void 0:a.modePlanId);if(!(!(s!=null&&s.id)||!i||!n||!l||!r))return{sizeClassId:i,weightClassId:n,bodyPlanId:l,modePlanId:r,presetId:s.id}},Ke=t=>{var a,i,n,l,r;const e=(a=Ze(t)[0])==null?void 0:a.id,s=be(t,e);return s||{sizeClassId:((i=Ne(t)[0])==null?void 0:i.id)??"",weightClassId:((n=He(t)[0])==null?void 0:n.id)??"",bodyPlanId:((l=ge(t)[0])==null?void 0:l.id)??"",modePlanId:((r=je(t)[0])==null?void 0:r.id)??""}},ve=t=>se(t).map(e=>({id:e.id,label:e.id.replaceAll("_"," "),detail:`${e.type}${e.count?` x${e.count}`:""}`})).sort(E),L=t=>{const e=ve(t).map(s=>s.id);return t.selectedZoneId&&e.includes(t.selectedZoneId)?t.selectedZoneId:e[0]},ye=(t,e)=>{var s;return(s=se(t).find(a=>a.id===e))==null?void 0:s.type},ae=(t,e)=>e?se(t).find(s=>s.id===e):void 0,Se=(t,e)=>t.catalogEntries.find(s=>s.kind==="slot_type"&&s.id===e),Q=(t,e)=>{if(!e)return;const s=Se(t,e.type);return`${x(s??{id:e.type})}${e.count>1?` x${e.count}`:""}`},we=(t,e)=>{const s=ae(t,e??L(t));return((s==null?void 0:s.slots)??[]).map(a=>({id:a.id,label:Q(t,a)??a.id,detail:a.type}))},ie=(t,e)=>{var a;const s=we(t,e);return t.selectedSlotId&&s.some(i=>i.id===t.selectedSlotId)?t.selectedSlotId:(a=s[0])==null?void 0:a.id},Qe=(t,e)=>{const s=e?ye(t,e):void 0;return V(t.catalogEntries,"emplacement_type").filter(a=>{var n;if(!s)return!0;const i=(n=C(a.placementRules))==null?void 0:n.allowedLocationTypes;return!Array.isArray(i)||i.includes(s)}).map(a=>({id:a.id??"",label:x(a),detail:Array.isArray(a.allowedWeaponClasses)?a.allowedWeaponClasses.join(", "):void 0})).filter(a=>a.id.length>0).sort(E)},qt=(t,e)=>t.catalogEntries.find(s=>s.id===e&&he.has(s.kind??"")),Et=(t,e)=>t.catalogEntries.find(s=>s.kind==="weapon_rule_profile"&&s.weaponProfileId===e&&s.isDefault===!0),G=(t,e,s,a)=>{var c;const i=e?ye(t,e):void 0,n=(c=ae(t,e))==null?void 0:c.slots.find(m=>m.id===s),l=t.catalogEntries.find(m=>m.kind==="emplacement_type"&&m.id===a),r=Array.isArray(l==null?void 0:l.allowedWeaponClasses)?l.allowedWeaponClasses:void 0;return t.catalogEntries.filter(m=>he.has(m.kind??"")).filter(m=>{const h=Xe(m);return!i||h.length===0||h.includes(i)}).filter(m=>n?J(t,n,m):!0).filter(m=>m.kind!=="weapon_profile"||!r?!0:r.includes(f(m.weaponClass)??"")).map(m=>({id:m.id??"",label:x(m),detail:m.kind==="weapon_profile"?f(m.weaponClass):f(m.kind)})).filter(m=>m.id.length>0).sort(E)},Pt=t=>(t==null?void 0:t.systemProfileId)??(t==null?void 0:t.weaponProfileId),Ge=t=>t.split("_").map(e=>{var s;return e.length===0?e:`${((s=e[0])==null?void 0:s.toUpperCase())??""}${e.slice(1)}`}).join(" "),Xe=t=>{var a,i;const e=t==null?void 0:t.requirements,s=[];if(Array.isArray(e))for(const n of e){const l=(a=C(n))==null?void 0:a.locationTypes;Array.isArray(l)&&s.push(...l.filter(r=>typeof r=="string"))}else{const n=(i=C(e))==null?void 0:i.locationTypes;Array.isArray(n)&&s.push(...n.filter(l=>typeof l=="string"))}return[...new Set(s)].sort()},Ye=t=>{var a,i;const e=t==null?void 0:t.requirements,s=[];if(Array.isArray(e))for(const n of e){const l=(a=C(n))==null?void 0:a.slotTypes;Array.isArray(l)&&s.push(...l.filter(r=>typeof r=="string"))}else{const n=(i=C(e))==null?void 0:i.slotTypes;Array.isArray(n)&&s.push(...n.filter(l=>typeof l=="string"))}return[...new Set(s)].sort()},J=(t,e,s)=>{if(!e||!s.kind)return!1;const a=Se(t,e.type);if(!a)return!1;const i=Ye(s);if(i.length>0&&!i.includes(e.type))return!1;const n=Array.isArray(a.acceptedKinds)?a.acceptedKinds:[];if(n.length>0&&!n.includes(s.kind))return!1;const l=Array.isArray(a.acceptedRoles)?a.acceptedRoles:[],r=f(s.role);return!(l.length>0&&(!r||!l.includes(r)))},Rt=(t,e,s)=>{var a;return(((a=ae(t,e))==null?void 0:a.slots)??[]).filter(i=>J(t,i,s))},Dt=t=>t.kind==="weapon_profile"?f(t.weaponClass):f(t.role)??f(t.kind),Bt=(t,e,s)=>{const a=Qe(t,e);if(s.kind!=="weapon_profile")return[];const i=f(s.weaponClass);return i?a.filter(n=>{const l=t.catalogEntries.find(c=>c.id===n.id),r=Array.isArray(l==null?void 0:l.allowedWeaponClasses)?l.allowedWeaponClasses:void 0;return!r||r.includes(i)}):a},Ie=t=>t.draftState.draft.selectedSystems.map((e,s)=>({index:s,locationId:e.locationId,slotId:e.slotId,systemId:Pt(e)})),Tt=t=>{var i,n;const e=L(t),s=((i=t.artifacts.validation)==null?void 0:i.errors)??[],a=((n=t.artifacts.validation)==null?void 0:n.warnings)??[];return se(t).map(l=>{const r=Ie(t).filter(h=>h.locationId===l.id).map(h=>h.index),c=r.some(h=>s.some(q=>q.path.startsWith(`/selectedSystems/${h}`))),m=r.some(h=>a.some(q=>q.path.startsWith(`/selectedSystems/${h}`)));return{id:l.id,label:Ge(l.id),type:`${l.type}${l.count?` x${l.count}`:""}`,count:l.count??1,selected:l.id===e,installedCount:r.length,status:c?"error":m?"warning":"clean"}})},Wt=(t,e)=>e==="all"?!0:e==="installed"?t.installed:t.fitStatus===e,T=(t,e)=>(t??"").localeCompare(e??""),Vt=t=>(e,s)=>t==="type"?T(e.kind,s.kind)||T(e.detail??e.classLabel,s.detail??s.classLabel)||T(e.label,s.label)||T(e.id,s.id):T(e.label,s.label)||T(e.id,s.id),Z=(t,e)=>[...t].sort(Vt(e)),ne=(t,e)=>{var q;const s=L(t),a=s?ye(t,s):void 0,i=s?ie(t,s):void 0,n=(q=ae(t,s))==null?void 0:q.slots.find(p=>p.id===i),l=Ie(t),r=t.equipmentQuery.trim().toLowerCase(),m=t.catalogEntries.filter(p=>he.has(p.kind??"")).map(p=>{var Le;const g=p.id??"",I=p.kind==="weapon_profile"?Et(t,g):void 0,S=l.find(z=>z.systemId===g),U=Xe(p),H=Ye(p),$e=s?Rt(t,s,p):[],$=n&&J(t,n,p)?n:$e[0],j=Se(t,$==null?void 0:$.type),ke=s&&p.kind==="weapon_profile"?Bt(t,s,p).filter(z=>{const Ae=Array.isArray(j==null?void 0:j.compatibleMountFamilies)?j.compatibleMountFamilies:[];if(Ae.length===0)return!0;const de=t.catalogEntries.find(pt=>pt.id===z.id),Ce=f(de==null?void 0:de.mountFamily);return!Ce||Ae.includes(Ce)}):[],B=[];s&&a&&U.length>0&&!U.includes(a)&&B.push(`Requires ${U.join(", ")}`),s&&$e.length===0?B.push(H.length>0?`Requires slot ${H.join(", ")}`:"No compatible logical slot on selected zone"):n&&!J(t,n,p)&&B.push(`Selected slot is ${Q(t,n)??n.type}`),p.kind==="weapon_profile"&&s&&ke.length===0&&B.push("No compatible emplacement on selected zone");const ct=x(p),le=Dt(p),ut=p.kind==="weapon_profile"?le:f(p.kind),xe=[U.length>0?`Location: ${U.join(", ")}`:void 0,H.length>0?`Slot: ${H.join(", ")}`:$?`Slot: ${Q(t,$)??$.type}`:void 0,p.kind==="weapon_profile"?`Mount: ${le??"weapon"}`:void 0].filter(z=>!!z),mt=xe.length>0?xe.join(" | "):"Any compatible zone",re=!!S;return{id:g,label:ct,kind:p.kind??"unknown",classLabel:le,detail:ut,requirementSummary:mt,fitStatus:re?"installed":B.length>0?"blocked":"legal",statusReason:B[0]??(re?`Installed on ${Ge((S==null?void 0:S.locationId)??"")}`:"Fits selected zone"),installed:re,installedLocationId:S==null?void 0:S.locationId,recommendedSlotId:$==null?void 0:$.id,recommendedSlotLabel:Q(t,$),recommendedEmplacementId:(Le=ke[0])==null?void 0:Le.id,selected:g===t.previewSystemId,previewed:g===t.previewSystemId,entry:p,ruleProfile:I}}).filter(p=>p.id.length>0).filter(p=>r.length===0||[p.label,p.id,p.kind,p.classLabel,p.requirementSummary].some(I=>I==null?void 0:I.toLowerCase().includes(r)));if(!e)return Z(m,t.equipmentSort);if(t.equipmentFilter!=="all")return Z(m.filter(p=>Wt(p,t.equipmentFilter)),t.equipmentSort);const h=Z(m.filter(p=>p.fitStatus!=="blocked"),t.equipmentSort);return t.equipmentShowAll?[...h,...Z(m.filter(p=>p.fitStatus==="blocked"),t.equipmentSort)]:h},Je=t=>ne(t,!0),Ut=t=>{const e=ne(t,!1);return{all:e.length,legal:e.filter(s=>s.fitStatus==="legal").length,blocked:e.filter(s=>s.fitStatus==="blocked").length,installed:e.filter(s=>s.installed).length}},et=t=>{const e=ne(t,!1);if(t.previewSystemId)return e.find(i=>i.id===t.previewSystemId);const s=L(t),a=Ie(t).find(i=>i.locationId===s&&i.systemId);if(a!=null&&a.systemId)return e.find(i=>i.id===a.systemId)},zt=t=>{const e=L(t);return ne(t,!1).filter(s=>s.installedLocationId===e)},O=(t,e)=>{const s=qt(t,e);return!e||!s?{systemProfileId:void 0,weaponProfileId:void 0}:{systemProfileId:e,weaponProfileId:s.kind==="weapon_profile"?e:void 0,...s.kind==="weapon_profile"?{}:{emplacementId:void 0}}},u=(t,e,s,a,i,n)=>({x:t,y:e,width:s,rotate:a,origin:i,z:n}),R={head:u(50,23,23,0,"50% 50%",40),core:u(50,39,44,0,"50% 50%",30),left_arm:u(30,43,46,-25,"82% 44%",20),right_arm:u(70,43,46,25,"18% 44%",20),left_leg:u(40,73,37,3,"50% 8%",10),right_leg:u(60,73,37,-3,"50% 8%",10)},Ft={...R,head:u(50,22,22,0,"50% 50%",42),core:u(50,39,50,0,"50% 50%",32),left_heavy_arm:u(27,42,50,-20,"82% 44%",18),right_heavy_arm:u(73,42,50,20,"18% 44%",18),left_arm:u(32,49,41,-28,"82% 44%",22),right_arm:u(68,49,41,28,"18% 44%",22),left_heavy_leg:u(37,74,40,4,"50% 8%",9),right_heavy_leg:u(63,74,40,-4,"50% 8%",9),left_leg:u(42,76,33,1,"50% 8%",12),right_leg:u(58,76,33,-1,"50% 8%",12)},Ot={head:u(50,24,18,0,"50% 50%",42),core:u(50,39,36,0,"50% 50%",32),left_arm:u(32,43,35,-22,"82% 44%",22),right_arm:u(68,43,35,22,"18% 44%",22),front_left_leg:u(29,68,22,5,"50% 8%",14),front_right_leg:u(71,68,22,-5,"50% 8%",14),rear_left_leg:u(42,73,22,2,"50% 8%",10),rear_right_leg:u(58,73,22,-2,"50% 8%",10)},Mt={head:u(50,23,17,0,"50% 50%",44),core:u(50,36,34,0,"50% 50%",34),left_arm:u(31,40,33,-22,"82% 44%",24),right_arm:u(69,40,33,22,"18% 44%",24),front_left_leg:u(23,60,20,15,"50% 8%",18),front_right_leg:u(77,60,20,-15,"50% 8%",18),mid_front_left_leg:u(35,67,20,8,"50% 8%",15),mid_front_right_leg:u(65,67,20,-8,"50% 8%",15),mid_rear_left_leg:u(43,74,19,2,"50% 8%",12),mid_rear_right_leg:u(57,74,19,-2,"50% 8%",12),rear_left_leg:u(30,82,19,-8,"50% 8%",9),rear_right_leg:u(70,82,19,8,"50% 8%",9)},Nt={head:u(50,22,21,0,"50% 50%",44),core:u(50,38,43,0,"50% 50%",34),upper_left_arm:u(28,36,44,-18,"82% 44%",22),upper_right_arm:u(72,36,44,18,"18% 44%",22),lower_left_arm:u(28,49,42,-32,"82% 44%",18),lower_right_arm:u(72,49,42,32,"18% 44%",18),left_arm:u(30,43,44,-24,"82% 44%",20),right_arm:u(70,43,44,24,"18% 44%",20),front_left_leg:u(38,73,33,4,"50% 8%",11),front_right_leg:u(62,73,33,-4,"50% 8%",11),rear_left_leg:u(42,78,31,1,"50% 8%",9),rear_right_leg:u(58,78,31,-1,"50% 8%",9),left_leg:u(40,74,36,3,"50% 8%",10),right_leg:u(60,74,36,-3,"50% 8%",10)},F={humanoid:{id:"humanoid",className:"layout-humanoid",aspectRatio:"6 / 5",slots:R},"heavy-humanoid":{id:"heavy-humanoid",className:"layout-heavy-humanoid",aspectRatio:"6 / 5",slots:Ft},quadruped:{id:"quadruped",className:"layout-quadruped",aspectRatio:"4 / 3",slots:Ot},"multi-arm":{id:"multi-arm",className:"layout-multi-arm",aspectRatio:"6 / 5",slots:Nt},drider:{id:"drider",className:"layout-drider",aspectRatio:"4 / 3",slots:Mt}},Ht=t=>{const e=new Set(t.map(s=>s.id));return e.has("mid_front_left_leg")||e.has("mid_rear_left_leg")?F.drider:e.has("upper_left_arm")||e.has("lower_left_arm")?F["multi-arm"]:e.has("front_left_leg")&&e.has("rear_left_leg")?F.quadruped:e.has("left_heavy_arm")||e.has("left_heavy_leg")?F["heavy-humanoid"]:F.humanoid},tt=(t,e)=>{const s=t.slots[e];return s||(e.includes("right_arm")?t.slots.right_arm??R.right_arm:e.includes("left_arm")?t.slots.left_arm??R.left_arm:e.includes("right_leg")?t.slots.right_leg??R.right_leg:e.includes("left_leg")?t.slots.left_leg??R.left_leg:t.slots.core??R.core)},st=t=>`--slot-x: ${t.x}; --slot-y: ${t.y}; --slot-w: ${t.width}; --slot-rotate: ${t.rotate}deg; --slot-origin: ${t.origin}; --slot-z: ${t.z};`,jt={dark:{"--bg":"#0b1015","--panel":"#141b23","--panel-soft":"#1c2631","--panel-raised":"#202b37","--text":"#e6edf4","--muted":"#8fa1b3","--accent":"#35a9ff","--accent-soft":"#123652","--line":"#2b3845","--legal":"#62d66e","--blocked":"#ff5a5f","--warning":"#f6a623","--signature":"#a775ff","--cyan":"#42d6e8"},light:{"--bg":"#f6f8fb","--panel":"#ffffff","--panel-soft":"#eef3f8","--panel-raised":"#e4edf5","--text":"#162230","--muted":"#5a6a7b","--accent":"#1769aa","--accent-soft":"#dcecff","--line":"#cbd8e4","--legal":"#238b45","--blocked":"#c7353d","--warning":"#a86a00","--signature":"#6f4bc4","--cyan":"#16899b"}},Zt=(t,e)=>{const s=[...t,...e].map(a=>({code:a.code,message:a.message,path:a.path}));return s.length===0?'<p class="diagnostic-empty">No diagnostics.</p>':s.map(a=>`<li class="diagnostic-item"><span class="diagnostic-code">${d(a.code)}</span><span class="diagnostic-path">${d(a.path)}</span><span class="diagnostic-message">${d(a.message)}</span></li>`).join("")},d=t=>String(t??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"),A=(t,e,s="Select")=>[`<option value="">${d(s)}</option>`,...t.map(i=>`<option value="${d(i.id)}" ${i.id===e?"selected":""}>${d(i.label)}${i.detail?` - ${d(i.detail)}`:""}</option>`)].join(""),Kt=t=>{const e=t.draftState.draft.frameAssembly,s=Ze(t);return`<div class="assembly-picker" aria-label="Frame assembly">
    <label>
      <span>Preset</span>
      <select data-action="preset.select">
        ${A(s,e.presetId,"Custom")}
      </select>
    </label>
    <label>
      <span>Body</span>
      <select data-action="assembly.select" data-assembly-field="bodyPlanId">
        ${A(ge(t),e.bodyPlanId,"Body")}
      </select>
    </label>
    <label>
      <span>Size</span>
      <select data-action="assembly.select" data-assembly-field="sizeClassId">
        ${A(Ne(t),e.sizeClassId,"Size")}
      </select>
    </label>
    <label>
      <span>Weight</span>
      <select data-action="assembly.select" data-assembly-field="weightClassId">
        ${A(He(t),e.weightClassId,"Weight")}
      </select>
    </label>
    <label>
      <span>Mode</span>
      <select data-action="assembly.select" data-assembly-field="modePlanId">
        ${A(je(t),e.modePlanId,"Mode")}
      </select>
    </label>
  </div>`},Qt=t=>t==="legal"?"Legal":t==="blocked"?"Blocked":t==="installed"?"Installed":"Slot first",Gt=t=>t==="type"?"Type":"Name",W=(t,e)=>{const s=(t==null?void 0:t.ruleProfile)??(t==null?void 0:t.entry),a=s==null?void 0:s.statSurface,i=s==null?void 0:s.costPressure;if(e==="mass")return String((i==null?void 0:i.mass)??"-");if(e==="slots")return String((i==null?void 0:i.slots)??"-");if(e==="power"){const n=a==null?void 0:a.power;return String((i==null?void 0:i.powerDraw)??(n==null?void 0:n.draw)??"-")}if(e==="heat"){const n=a==null?void 0:a.heat;return String((i==null?void 0:i.heatPerUse)??(n==null?void 0:n.perUse)??"-")}return e==="output"?String((a==null?void 0:a.output)??"-"):e==="range"?String((a==null?void 0:a.range)??"-"):"-"},Xt=t=>["doll-zone",`zone-${t.id}`,t.selected?"is-selected":"",t.status!=="clean"?`is-${t.status}`:""].filter(Boolean).join(" "),Pe=t=>t==="head"?"Head":t.replaceAll("_"," ").replace(/\b\w/g,e=>e.toUpperCase()),Yt=t=>{var e;return t==="core"?"Body":`${((e=t[0])==null?void 0:e.toUpperCase())??""}${t.slice(1)}`},Jt=(t,e)=>`${(-t*100/e.frameCount).toFixed(4)}%`,at=(t,e,s,a,i="")=>{const n=t.frameWidth/t.frameHeight;return`<span class="part-sprite-frame visual-kind-${s} ${a?"is-mirrored":""} ${i}" data-visual-sheet-id="${d(t.id)}" data-visual-weight="${t.weight}" data-visual-frame-index="${e}" style="--sprite-ratio: ${n}; --sprite-shift: ${Jt(e,t)};">
    <img class="part-sprite-strip" src="${d(t.url)}" alt="" draggable="false" />
  </span>`},it=(t,e="")=>at(t.sheet,t.frameIndex,t.kind,t.mirrored,e),es=(t,e)=>{const s=Ve(t.visual,"head"),a=t.visual.activeSlotId==="head",i=tt(e,"head");return`<button class="doll-zone visual-head-zone ${a?"is-selected":""}" type="button" data-action="visual.slot.select" data-visual-slot="head" data-visual-layout-slot="head" aria-pressed="${a}" style="${st(i)}">
    <span class="zone-sprite">${it(s,"zone-sprite-frame")}</span>
    <span class="zone-name">Head</span>
    <span class="zone-type">visual</span>
  </button>`},ts=t=>{const e=Tt(t),s=L(t),a=Ht(e);return`<section class="paper-doll-panel" aria-label="Paper doll zones">
    <div class="paper-doll-header">
      <div>
        <span class="eyebrow">Frame Map</span>
        <strong>${d(s?s.replaceAll("_"," "):"No zone")}</strong>
      </div>
      <span class="doll-legend"><span></span> installed systems</span>
    </div>
    <div class="paper-doll-grid mech-stage ${a.className}" data-stage-layout="${a.id}" style="--stage-aspect: ${a.aspectRatio};">
      <div class="topology-scaffold" aria-hidden="true"><span class="scaffold-core"></span><span class="scaffold-arm scaffold-left"></span><span class="scaffold-arm scaffold-right"></span><span class="scaffold-leg scaffold-a"></span><span class="scaffold-leg scaffold-b"></span><span class="scaffold-leg scaffold-c"></span><span class="scaffold-leg scaffold-d"></span></div>
      ${es(t,a)}
      ${e.map(i=>{const n=Ve(t.visual,i.id),l=tt(a,i.id);return`<button class="${Xt(i)}" type="button" data-action="zone.select" data-zone-id="${d(i.id)}" data-visual-slot="${d(i.id)}" data-visual-layout-slot="${d(i.id)}" aria-pressed="${i.selected}" style="${st(l)}">
            <span class="zone-sprite">${it(n,"zone-sprite-frame")}</span>
            <span class="zone-name">${d(i.label)}</span>
            <span class="zone-type">${d(i.type)}</span>
            ${i.installedCount>0?`<span class="zone-count">${i.installedCount}</span>`:""}
          </button>`}).join("")}
    </div>
  </section>`},ss=t=>{const e=t.visual.activeSlotId,s=M(e),a=Y(s,t.visual.activeWeight),i=N(s,a),n=t.visual.selections[e],l=_t(s);return i?`<section class="visual-picker-panel" aria-label="Visual part picker">
    <div class="visual-picker-header">
      <div>
        <span class="eyebrow">Visual Parts</span>
        <strong>${d(Pe(e))}</strong>
      </div>
      <span>${d(Yt(s))} - ${d(i.label)}</span>
    </div>
    <div class="visual-weight-tabs" role="tablist" aria-label="Visual weight">
      ${X.filter(r=>l.includes(r)).map(r=>`<button type="button" class="visual-weight-tab ${r===a?"is-active":""}" data-action="visual.weight.select" data-visual-weight="${r}" role="tab" aria-selected="${r===a}">${d(wt[r])}</button>`).join("")}
    </div>
    <div class="visual-style-grid" role="listbox" aria-label="Visual style choices">
      ${Array.from({length:v},(r,c)=>{const m=(n==null?void 0:n.weight)===a&&n.frameIndex===c,h=Be[c]??`Style ${c+1}`;return`<button type="button" class="visual-style-option ${m?"is-selected":""}" data-action="visual.part.select" data-visual-slot="${d(e)}" data-visual-weight="${a}" data-frame-index="${c}" role="option" aria-selected="${m}" title="${d(h)}">
          ${at(i,c,s,!1,"picker-sprite-frame")}
          <span>${d(h)}</span>
        </button>`}).join("")}
    </div>
  </section>`:`<section class="visual-picker-panel" aria-label="Visual part picker">
      <div class="visual-picker-header">
        <div>
          <span class="eyebrow">Visual Parts</span>
          <strong>${d(Pe(e))}</strong>
        </div>
        <span>No sheet available</span>
      </div>
    </section>`},as=t=>{const e=L(t),s=ie(t,e),a=we(t,e);return`<section class="slot-picker-panel" aria-label="Logical slots">
    <div class="slot-picker-header">
      <div>
        <span class="eyebrow">Logical Slots</span>
        <strong>${d(e?e.replaceAll("_"," "):"No zone")}</strong>
      </div>
      <span>${a.length} slots</span>
    </div>
    <div class="slot-list" role="listbox" aria-label="Install slots">
      ${a.length===0?'<span class="diagnostic-empty">No logical slots on this zone.</span>':a.map(i=>`<button type="button" class="slot-option ${i.id===s?"is-active":""}" data-action="slot.select" data-slot-id="${d(i.id)}" role="option" aria-selected="${i.id===s}">
                    <strong>${d(i.label)}</strong>
                    <span>${d(i.detail??i.id)}</span>
                  </button>`).join("")}
    </div>
  </section>`},is=t=>t.draftState.draft.selectedSystems.length===0?'<li class="system-empty">No systems selected.</li>':t.draftState.draft.selectedSystems.map((e,s)=>{const a=ve(t),i=we(t,e.locationId),n=e.slotId??ie(t,e.locationId),l=Qe(t,e.locationId),r=G(t,e.locationId,n,e.emplacementId),c=e.systemProfileId??e.weaponProfileId;return`
      <li class="system-row" data-index="${s}">
        <label>
          <span>Location</span>
          <select data-action="system.location" data-index="${s}">
            ${A(a,e.locationId,"Location")}
          </select>
        </label>
        <label>
          <span>Slot</span>
          <select data-action="system.slot" data-index="${s}">
            ${A(i,n,"Slot")}
          </select>
        </label>
        <label>
          <span>Emplacement</span>
          <select data-action="system.emplacement" data-index="${s}">
            ${A(l,e.emplacementId,"Emplacement")}
          </select>
        </label>
        <label>
          <span>System</span>
          <select data-action="system.profile" data-index="${s}">
            ${A(r,c,"System")}
          </select>
        </label>
        <button type="button" data-action="system.remove" data-index="${s}" title="Remove system">Remove</button>
      </li>`}).join(""),ns=t=>{const e=et(t),s=zt(t),a=L(t),i=e?t.draftState.draft.selectedSystems.findIndex(n=>(n.systemProfileId??n.weaponProfileId)===e.id):-1;return`<section class="inspector-panel" aria-label="Selected equipment inspector">
    <div class="inspector-visual">
      <span class="inspector-kind">${d((e==null?void 0:e.classLabel)??(e==null?void 0:e.kind)??"Select")}</span>
      <strong>${d((e==null?void 0:e.label)??"Choose a system")}</strong>
      <span>${d((e==null?void 0:e.id)??`Zone: ${a??"none"}`)}</span>
    </div>
    <div class="inspector-body">
      <div class="trait-row">
        ${(e?[e.kind,e.classLabel,e.fitStatus]:["No item selected"]).filter(Boolean).map(n=>`<span class="trait-chip">${d(n)}</span>`).join("")}
      </div>
      <p class="inspector-copy">${d((e==null?void 0:e.statusReason)??"Pick a body zone, then preview or install equipment from the browser.")}</p>
      <dl class="stat-list">
        <div><dt>Output</dt><dd>${d(W(e,"output"))}</dd></div>
        <div><dt>Range</dt><dd>${d(W(e,"range"))}</dd></div>
        <div><dt>Mass</dt><dd>${d(W(e,"mass"))}</dd></div>
        <div><dt>Slots</dt><dd>${d(W(e,"slots"))}</dd></div>
        <div><dt>Heat</dt><dd>${d(W(e,"heat"))}</dd></div>
        <div><dt>Power</dt><dd>${d(W(e,"power"))}</dd></div>
      </dl>
      <div class="inspector-actions">
        <button type="button" data-action="equipment.install" data-system-id="${d((e==null?void 0:e.id)??"")}" ${!e||e.fitStatus==="blocked"?"disabled":""}>${e!=null&&e.installed?"Install Another":"Install"}</button>
        ${i>=0?`<button type="button" data-action="system.remove" data-index="${i}">Remove</button>`:""}
      </div>
      <details class="fallback-editor">
        <summary>Draft rows</summary>
        <ul class="system-list">${is(t)}</ul>
      </details>
      <div class="installed-list">
        <span class="eyebrow">Installed here</span>
        ${s.length===0?'<p class="diagnostic-empty">No systems in this zone.</p>':s.map(n=>`<button type="button" data-action="equipment.select" data-system-id="${d(n.id)}">${d(n.label)}</button>`).join("")}
      </div>
    </div>
  </section>`},os=t=>{const e=Je(t),s=Ut(t),a=["all","legal","blocked","installed"],i=["name","type"],n=s.legal+s.installed,l=e.findIndex(c=>c.fitStatus==="blocked");return`<section class="equipment-panel" aria-label="Equipment browser">
    <div class="equipment-tabs">
      <strong>Equipment</strong>
      <span>${t.equipmentFilter==="all"&&!t.equipmentShowAll&&s.blocked>0?`${e.length} shown, ${s.blocked} hidden`:`${e.length} shown`}</span>
    </div>
    <div class="equipment-controls">
      <div class="equipment-toolbar">
        <div class="filter-buttons" aria-label="Equipment fit filters">
          ${a.map(c=>{const m=c==="all"?n:s[c];return`<button type="button" class="filter-button ${t.equipmentFilter===c?"is-active":""} filter-${c}" data-action="equipment.filter" data-filter="${c}">${Qt(c)} (${m})</button>`}).join("")}
        </div>
        <label class="toggle-field equipment-show-all">
          <input type="checkbox" data-field="equipmentShowAll" ${t.equipmentShowAll?"checked":""} />
          <span>Show all (${s.blocked})</span>
        </label>
        <div class="sort-buttons" aria-label="Sort equipment">
          <span>Sort</span>
          ${i.map(c=>`<button type="button" class="filter-button sort-button ${t.equipmentSort===c?"is-active":""}" data-action="equipment.sort" data-sort="${c}">${Gt(c)}</button>`).join("")}
        </div>
      </div>
      <label class="search-field">
        <span>Search</span>
        <input data-field="equipmentQuery" value="${d(t.equipmentQuery)}" placeholder="Search equipment..." />
      </label>
    </div>
    <div class="equipment-table-wrap">
      <table class="equipment-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Kind</th>
            <th>Req</th>
            <th>Fit</th>
            <th>Slot / Mount</th>
          </tr>
        </thead>
        <tbody>
          ${e.length===0?'<tr><td colspan="5" class="diagnostic-empty">No equipment matches this filter.</td></tr>':e.map((c,m)=>`${m===l?'<tr class="equipment-section-row"><td colspan="5">Blocked for selected slot</td></tr>':""}<tr class="equipment-row status-${c.fitStatus} ${c.previewed?"is-previewed":""}" tabindex="0" data-action="equipment.select" data-system-id="${d(c.id)}">
                      <td><strong>${d(c.label)}</strong><span>${d(c.id)}</span></td>
                      <td>${d(c.detail??c.kind)}</td>
                      <td>${d(c.requirementSummary)}</td>
                      <td><span class="status-chip">${d(c.fitStatus)}</span></td>
                      <td>${d([c.recommendedSlotLabel,c.recommendedEmplacementId].filter(Boolean).join(" / ")||"-")}</td>
                    </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </section>`},ls=t=>{const e=t.artifacts.validation;return!!(e&&(!e.ok||e.errors.length>0||e.warnings.length>0))},rs=t=>{if(t.openDrawer==="appearance"||t.openDrawer==="diagnostics")return t.openDrawer;if(t.openDrawer!=="closed")return ls(t)?"diagnostics":void 0},ds=(t,e)=>{const s=t.artifacts.validation,a=((s==null?void 0:s.errors.length)??0)+((s==null?void 0:s.warnings.length)??0);return`<div class="drawer-controls" aria-label="Secondary panels">
    <button type="button" class="drawer-toggle ${e==="appearance"?"is-active":""}" data-action="drawer.toggle" data-drawer="appearance" title="Open appearance picker">Appearance</button>
    <button type="button" class="drawer-toggle ${e==="diagnostics"?"is-active":""}" data-action="drawer.toggle" data-drawer="diagnostics" title="Open diagnostics and runtime">Diagnostics${a>0?` (${a})`:""}</button>
  </div>`},cs=t=>{var e,s;return`<section class="diagnostics-dock drawer-panel" aria-label="Diagnostics and runtime">
  <div class="dock-header">
    <strong>Diagnostics</strong>
    <span>${d(t.lastMessage??t.statusText??"")}</span>
  </div>
  <ul>
    ${Zt(((e=t.artifacts.validation)==null?void 0:e.errors)??[],((s=t.artifacts.validation)==null?void 0:s.warnings)??[])}
  </ul>
  ${ms(t)}
</section>`},us=t=>{const e=jt[t];return Object.entries(e).map(([s,a])=>`${s}: ${a};`).join(" ")},ms=t=>{const e=t.artifacts.runtime;return e?`<section class="runtime-inline">
    <span>Runtime</span>
    <strong>${d(e.state.phase)} cycle ${e.state.cycle}</strong>
    <span>${d(e.sessionId)}</span>
    <span>Heat ${e.state.heat}/${e.state.heatCapacity}</span>
    <span>Power ${e.state.power}/${e.state.powerCapacity}</span>
    <button type="button" data-action="runtime.advance">Advance</button>
    <label><span>Heat</span><input data-field="heatReduction" type="number" min="0" value="5" /></label>
    <button type="button" data-action="runtime.stabilize">Stabilize</button>
    <label><span>Damage</span><input data-field="damageAmount" type="number" min="1" value="10" /></label>
    <button type="button" data-action="runtime.damage">Damage</button>
  </section>`:`<section class="runtime-inline">
      <span>Runtime</span>
      <strong>Not started</strong>
      <button type="button" data-action="runtime.start">Start</button>
    </section>`},ps=t=>{var n;const e=t.artifacts.validation,s=((n=e==null?void 0:e.computed)==null?void 0:n.selectedCounts)??{},a=t.artifacts.runtime,i=t.draftState.draft.selectedSystems.length;return`<section class="build-strip" aria-label="Build summary">
    <div class="build-status"><span>Build</span><strong>${e?e.ok?"Valid":"Issues":"Draft"}</strong></div>
    <div><span>Systems</span><strong>${i}</strong></div>
    <div><span>Points</span><strong>${d(s.totalBuildPoints??"-")}</strong></div>
    <div><span>Slots</span><strong>${d(s.totalSlots??i)}</strong></div>
    <div><span>Emplacements</span><strong>${d(s.totalEmplacements??"-")}</strong></div>
    <div><span>Heat</span><strong>${a?`${a.state.heat}/${a.state.heatCapacity}`:"-"}</strong></div>
    <div><span>Power</span><strong>${a?`${a.state.power}/${a.state.powerCapacity}`:"-"}</strong></div>
    <div><span>Runtime</span><strong>${a?`Cycle ${a.state.cycle}`:"Ready"}</strong></div>
  </section>`},fs=()=>`<nav class="tool-rail" aria-label="Workbench tools">
    ${[["Builder","BLD",!0],["Stats","STA",!1],["Skills","SKL",!1],["Paint","PNT",!1],["Test","TST",!1],["Save","SAV",!1],["Load","LOD",!1],["Export","EXP",!1]].map(([e,s,a])=>`<button type="button" class="${a?"is-active":""}" ${a?"":"disabled"} title="${d(e)}"><span>${s}</span><small>${d(e)}</small></button>`).join("")}
  </nav>`,hs=t=>{var e;return`
  <main class="shell workbench-shell" data-theme="${t.theme}">
    <style>:root { ${us(t.theme)} }</style>
    ${fs()}
    <section class="workbench-main">
      <header class="workbench-header">
        <div class="brand-block">
          <span class="eyebrow">Sentinel MECA Workbench</span>
          <div class="brand-title-row">
            <strong>${d(((e=ge(t).find(s=>s.id===t.draftState.draft.frameAssembly.bodyPlanId))==null?void 0:e.label)??"No body selected")}</strong>
            ${t.workbenchMode==="demo"?'<span class="mode-badge" title="Static in-browser demo">Static demo</span>':""}
          </div>
        </div>
        <label>
          <span>Pack</span>
          <input data-field="packId" value="${d(t.packId)}" />
        </label>
        <label>
          <span>Build Session</span>
          <input data-field="buildSessionId" value="${d(t.buildSessionId??"")}" />
        </label>
        ${Kt(t)}
        <div class="header-actions">
          <button type="button" data-action="catalog.load" title="Load catalog">Cat</button>
          <button type="button" data-action="session.create" title="Create session">New</button>
          <button type="button" data-action="session.load" title="Load session">Load</button>
          <button type="button" data-action="session.validate" title="Validate build">Chk</button>
          <button type="button" data-action="session.compile" title="Compile build">Build</button>
          <button type="button" data-action="theme.toggle" title="Toggle theme">${t.theme==="dark"?"Light":"Dark"}</button>
        </div>
      </header>
      ${(()=>{const s=rs(t);return`<section class="workbench-grid ${s?"has-open-drawer":""}">
        <div class="body-workbench">
          ${ts(t)}
          ${as(t)}
        </div>
        <div class="detail-workbench ${s?"has-open-drawer":""}">
          ${ns(t)}
          ${ds(t,s)}
          ${s==="appearance"?ss(t):""}
          ${s==="diagnostics"?cs(t):""}
        </div>
        <div class="equipment-workbench">
          ${os(t)}
        </div>
      </section>`})()}
    </section>
    ${ps(t)}
  </main>`},_e="sentinel.core",P=document.querySelector("#app"),o=new kt(Oe(_e));let w;if(!P)throw new Error("Missing #app root.");const b=t=>{o.setLastMessage(t)},k=()=>o.state.draftState.draft,gs=()=>{var t;return(t=ve(o.state)[0])==null?void 0:t.id},D=(t=!1)=>{const e=t?gs():L(o.state);e!==o.state.selectedZoneId&&o.setSelectedZoneId(e)},nt=t=>{o.setDraft(t),D()},ot=t=>{o.setBuildSessionId(t.id),o.setPackId(t.packId),o.setDraft(t.draft),t.validation&&o.setValidation(t.validation),D()},y=()=>{P.innerHTML=hs(o.state)},ee=t=>{var e;return((e=P.querySelector(`[data-field="${t}"]`))==null?void 0:e.value.trim())??""},K=(t,e)=>{o.updateSystem(t,e)},lt=t=>{var e;return!!((e=t.frameAssembly)!=null&&e.sizeClassId&&t.frameAssembly.weightClassId&&t.frameAssembly.bodyPlanId&&t.frameAssembly.modePlanId)},bs=new Set(["all","legal","blocked","installed"]),vs=new Set(["name","type"]),ys=new Set(["appearance","diagnostics"]),Ss=new Set(X),ws=t=>!!(t&&bs.has(t)),Is=t=>!!(t&&vs.has(t)),_s=t=>!!(t&&ys.has(t)),Re=t=>!!(t&&Ss.has(t)),$s=t=>{const e=t||o.state.previewSystemId;if(!e){b("Select equipment first.");return}o.setPreviewSystemId(e);const s=L(o.state);if(!s){b("Select a body zone first.");return}const a=et(o.state)??Je(o.state).find(i=>i.id===e);if(!a){b("Selected equipment is not in the loaded catalog.");return}if(a.fitStatus==="blocked"){b(a.statusReason);return}nt({...k(),selectedSystems:[...k().selectedSystems,{locationId:s,slotId:a.recommendedSlotId,emplacementId:a.entry.kind==="weapon_profile"?a.recommendedEmplacementId:void 0,...O(o.state,e)}]}),b(`${a.label} installed on ${s.replaceAll("_"," ")}.`)},rt=async()=>{const t=o.state.buildSessionId;if(!t){b("Create a build session first.");return}const e=await w.patchBuildSession(t,k());e.ok&&e.data?(o.setDraft(e.data.draft),b("Draft saved.")):o.setValidation({ok:!1,errors:e.errors??[],warnings:e.warnings??[]})},oe=async()=>{const t=ee("packId")||o.state.packId||_e;o.setPackId(t);const e=await w.getCatalogEntries({packId:t});o.setCatalogEntries(e),lt(o.state.draftState.draft)?D():(o.setFrameAssembly(Ke(o.state)),D(!0)),b(e.ok?"Catalog loaded.":"Catalog has diagnostics.")},dt=async()=>{o.state.catalogEntries.length===0&&await oe();const t=lt(k())?k().frameAssembly:Ke(o.state),e={...k(),frameAssembly:t};nt(e);const s=await w.createBuildSession({packId:o.state.packId||_e,draft:e});s.ok&&s.data?(o.setBuildSessionId(s.data.id),o.setDraft(s.data.draft),b("Build session created.")):o.setValidation({ok:!1,errors:s.errors??[],warnings:s.warnings??[]})},ks=async()=>{const t=ee("buildSessionId")||o.state.buildSessionId;if(!t){b("Enter a build session id.");return}const e=await w.getBuildSession(t);e.ok&&e.data?(ot(e.data),await oe(),b("Build session loaded.")):o.setValidation({ok:!1,errors:e.errors??[],warnings:e.warnings??[]})},xs=async()=>{if(!w.loadStoredState)return;const t=await w.loadStoredState();t&&(t.buildSession&&(ot(t.buildSession),b("Static demo session restored.")),t.runtimeSession&&o.setRuntime(t.runtimeSession,t.runtimeSession.sessionId))},te=async t=>{o.state.buildSessionId?await rt():await dt();const s=o.state.buildSessionId;if(!s)return;const a=t==="validate"?await w.validateBuildSession(s):await w.compileBuildSession(s);o.setValidation(a.data??{ok:!1,errors:a.errors??[],warnings:a.warnings??[]})},Ls=async()=>{var a;o.state.buildSessionId?await te("compile"):await te("compile");const e=o.state.buildSessionId;if(!e)return;const s=await w.startRuntime(e);s.ok&&((a=s.data)!=null&&a.session)?(o.setRuntime(s.data.session,s.data.session.sessionId),b("Runtime started.")):o.setValidation({ok:!1,errors:s.errors??[],warnings:s.warnings??[]})},ue=async t=>{var a;const e=o.state.runtimeSessionId;if(!e){b("Start runtime first.");return}const s=await w.stepRuntime(e,t);(a=s.data)!=null&&a.session&&o.setRuntime(s.data.session,e),s.ok||o.setValidation({ok:!1,errors:s.errors??[],warnings:s.warnings??[]})},De=async t=>{const e=t.dataset.action;if(e){if(e==="theme.toggle")o.toggleTheme();else if(e==="catalog.load")await oe();else if(e==="preset.select"){const s=be(o.state,t.dataset.presetId);s&&(o.setFrameAssembly(s),D(!0))}else if(e==="zone.select"){const s=t.dataset.zoneId;o.setSelectedZoneId(s),(t.dataset.visualSlot??s)&&o.setActiveVisualSlot(t.dataset.visualSlot??s??"core"),o.setPreviewSystemId(void 0)}else if(e==="slot.select")o.setSelectedSlotId(t.dataset.slotId),o.setPreviewSystemId(void 0);else if(e==="visual.slot.select"){const s=t.dataset.visualSlot;s&&o.setActiveVisualSlot(s)}else if(e==="visual.weight.select")Re(t.dataset.visualWeight)&&o.setVisualWeight(t.dataset.visualWeight);else if(e==="visual.part.select"){const s=t.dataset.visualSlot??o.state.visual.activeSlotId,a=Number.parseInt(t.dataset.frameIndex??"0",10);s&&Re(t.dataset.visualWeight)&&o.setVisualPart(s,t.dataset.visualWeight,a)}else if(e==="equipment.filter")ws(t.dataset.filter)&&o.setEquipmentFilter(t.dataset.filter);else if(e==="equipment.sort")Is(t.dataset.sort)&&o.setEquipmentSort(t.dataset.sort);else if(e==="drawer.toggle"){if(_s(t.dataset.drawer)){const s=t.dataset.drawer;o.setOpenDrawer(o.state.openDrawer===s?"closed":s)}}else e==="equipment.select"?o.setPreviewSystemId(t.dataset.systemId):e==="equipment.install"?$s(t.dataset.systemId):e==="session.create"?await dt():e==="session.load"?await ks():e==="session.save"?await rt():e==="session.validate"?await te("validate"):e==="session.compile"?await te("compile"):e==="system.add"?o.addSystem():e==="system.remove"?o.removeSystem(Number.parseInt(t.dataset.index??"-1",10)):e==="runtime.start"?await Ls():e==="runtime.advance"?await ue({kind:"advance",ticks:1}):e==="runtime.stabilize"?await ue({kind:"stabilize",heatReduction:Number.parseInt(ee("heatReduction"),10)||0}):e==="runtime.damage"&&await ue({kind:"receiveDamage",amount:Number.parseInt(ee("damageAmount"),10)||1});y()}},As=t=>{const e=t.dataset.action;if(t.dataset.field==="packId"){o.setPackId(t.value),y();return}if(t.dataset.field==="buildSessionId"){o.setBuildSessionId(t.value||void 0),y();return}if(t.dataset.field==="equipmentQuery"){o.setEquipmentQuery(t.value),y();return}if(t.dataset.field==="equipmentShowAll"&&t instanceof HTMLInputElement){o.setEquipmentShowAll(t.checked),y();return}if(e==="preset.select"){const s=be(o.state,t.value);s&&(o.setFrameAssembly(s),D(!0),o.setPreviewSystemId(void 0))}else if(e==="assembly.select"){const s=t.dataset.assemblyField;s&&["sizeClassId","weightClassId","bodyPlanId","modePlanId"].includes(s)&&(o.setFrameAssembly({...k().frameAssembly,[s]:t.value,presetId:void 0}),D(s==="bodyPlanId"))}else if(e!=null&&e.startsWith("system.")){const s=Number.parseInt(t.dataset.index??"-1",10);if(s<0)return;if(e==="system.location"){const a=k().selectedSystems[s],i=(a==null?void 0:a.systemProfileId)??(a==null?void 0:a.weaponProfileId),n=ie(o.state,t.value),l=new Set(G(o.state,t.value,n).map(c=>c.id)),r=i&&l.has(i)?i:void 0;K(s,{locationId:t.value,slotId:n,emplacementId:void 0,...O(o.state,r)})}else if(e==="system.slot"){const a=k().selectedSystems[s],i=(a==null?void 0:a.systemProfileId)??(a==null?void 0:a.weaponProfileId),n=new Set(G(o.state,a==null?void 0:a.locationId,t.value||void 0,a==null?void 0:a.emplacementId).map(r=>r.id)),l=i&&n.has(i)?i:void 0;K(s,{slotId:t.value||void 0,...O(o.state,l)})}else if(e==="system.emplacement"){const a=k().selectedSystems[s],i=(a==null?void 0:a.systemProfileId)??(a==null?void 0:a.weaponProfileId),n=new Set(G(o.state,a==null?void 0:a.locationId,a==null?void 0:a.slotId,t.value||void 0).map(r=>r.id)),l=i&&n.has(i)?i:void 0;K(s,{emplacementId:t.value||void 0,...O(o.state,l)})}else e==="system.profile"&&K(s,{...O(o.state,t.value||void 0)})}y()};P.addEventListener("click",t=>{const e=t.target.closest("[data-action]");e&&(e instanceof HTMLButtonElement?(e.disabled=!0,De(e).finally(()=>{e.disabled=!1})):De(e))});P.addEventListener("mouseover",t=>{const e=t.target.closest(".equipment-row[data-system-id]"),s=e==null?void 0:e.dataset.systemId;s&&s!==o.state.previewSystemId&&(o.setPreviewSystemId(s),y())});P.addEventListener("focusin",t=>{const e=t.target.closest(".equipment-row[data-system-id]"),s=e==null?void 0:e.dataset.systemId;s&&s!==o.state.previewSystemId&&(o.setPreviewSystemId(s),y())});P.addEventListener("input",t=>{const e=t.target;e instanceof HTMLInputElement&&e.dataset.field==="equipmentQuery"&&(o.setEquipmentQuery(e.value),y())});P.addEventListener("change",t=>{const e=t.target;(e instanceof HTMLInputElement||e instanceof HTMLSelectElement)&&As(e)});const Cs=async()=>{w=await yt(),o.setWorkbenchMode(w.mode),y(),await oe(),await xs(),y()};y();Cs().catch(t=>{const e=t instanceof Error?t.message:String(t);b(`Workbench failed to start: ${e}`),y()});export{Ps as a,Es as d,Rs as s};
