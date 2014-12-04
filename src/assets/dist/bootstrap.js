/*!
 * Modernizr v1.6
 * http://www.modernizr.com
 *
 * Developed by: 
 * - Faruk Ates  http://farukat.es/
 * - Paul Irish  http://paulirish.com/
 *
 * Copyright (c) 2009-2010
 * Dual-licensed under the BSD or MIT licenses.
 * http://www.modernizr.com/license/
 */
window.Modernizr=(function(p,w,m){var g="1.6",I={},y=true,G=w.documentElement,j=w.head||w.getElementsByTagName("head")[0],H="modernizr",E=w.createElement(H),C=E.style,i=w.createElement("input"),F=":)",z=Object.prototype.toString,A=" -webkit- -moz- -o- -ms- -khtml- ".split(" "),r="Webkit Moz O ms Khtml".split(" "),J={svg:"http://www.w3.org/2000/svg"},l={},e={},x={},D=[],B,d=function(M){var L=w.createElement("style"),N=w.createElement("div"),K;L.textContent=M+"{#modernizr{height:3px}}";j.appendChild(L);N.id="modernizr";G.appendChild(N);K=N.offsetHeight===3;L.parentNode.removeChild(L);N.parentNode.removeChild(N);return !!K},u=(function(){var L={select:"input",change:"input",submit:"form",reset:"form",error:"img",load:"img",abort:"img"};function K(M,O){O=O||w.createElement(L[M]||"div");M="on"+M;var N=(M in O);if(!N){if(!O.setAttribute){O=w.createElement("div")}if(O.setAttribute&&O.removeAttribute){O.setAttribute(M,"");N=n(O[M],"function");if(!n(O[M],m)){O[M]=m}O.removeAttribute(M)}}O=null;return N}return K})();var s=({}).hasOwnProperty,q;if(!n(s,m)&&!n(s.call,m)){q=function(K,L){return s.call(K,L)}}else{q=function(K,L){return((L in K)&&n(K.constructor.prototype[L],m))}}function v(K){C.cssText=K}function b(L,K){return v(A.join(L+";")+(K||""))}function n(L,K){return typeof L===K}function o(L,K){return(""+L).indexOf(K)!==-1}function h(L,M){for(var K in L){if(C[L[K]]!==m&&(!M||M(L[K],E))){return true}}}function a(N,M){var L=N.charAt(0).toUpperCase()+N.substr(1),K=(N+" "+r.join(L+" ")+L).split(" ");return !!h(K,M)}l.flexbox=function(){function L(Q,S,R,P){S+=":";Q.style.cssText=(S+A.join(R+";"+S)).slice(0,-S.length)+(P||"")}function N(Q,S,R,P){Q.style.cssText=A.join(S+":"+R+";")+(P||"")}var O=w.createElement("div"),M=w.createElement("div");L(O,"display","box","width:42px;padding:0;");N(M,"box-flex","1","width:10px;");O.appendChild(M);G.appendChild(O);var K=M.offsetWidth===42;O.removeChild(M);G.removeChild(O);return K};l.canvas=function(){var K=w.createElement("canvas");return !!(K.getContext&&K.getContext("2d"))};l.canvastext=function(){return !!(I.canvas&&n(w.createElement("canvas").getContext("2d").fillText,"function"))};l.webgl=function(){var K=w.createElement("canvas");try{if(K.getContext("webgl")){return true}}catch(L){}try{if(K.getContext("experimental-webgl")){return true}}catch(L){}return false};l.touch=function(){return("ontouchstart" in p)||d("@media ("+A.join("touch-enabled),(")+"modernizr)")};l.geolocation=function(){return !!navigator.geolocation};l.postmessage=function(){return !!p.postMessage};l.websqldatabase=function(){var K=!!p.openDatabase;return K};l.indexedDB=function(){for(var L=-1,K=r.length;++L<K;){var M=r[L].toLowerCase();if(p[M+"_indexedDB"]||p[M+"IndexedDB"]){return true}}return false};l.hashchange=function(){return u("hashchange",p)&&(w.documentMode===m||w.documentMode>7)};l.history=function(){return !!(p.history&&history.pushState)};l.draganddrop=function(){return u("dragstart")&&u("drop")};l.websockets=function(){return("WebSocket" in p)};l.rgba=function(){v("background-color:rgba(150,255,150,.5)");return o(C.backgroundColor,"rgba")};l.hsla=function(){v("background-color:hsla(120,40%,100%,.5)");return o(C.backgroundColor,"rgba")||o(C.backgroundColor,"hsla")};l.multiplebgs=function(){v("background:url(//:),url(//:),red url(//:)");return new RegExp("(url\\s*\\(.*?){3}").test(C.background)};l.backgroundsize=function(){return a("backgroundSize")};l.borderimage=function(){return a("borderImage")};l.borderradius=function(){return a("borderRadius","",function(K){return o(K,"orderRadius")})};l.boxshadow=function(){return a("boxShadow")};l.textshadow=function(){return w.createElement("div").style.textShadow===""};l.opacity=function(){b("opacity:.55");return/^0.55$/.test(C.opacity)};l.cssanimations=function(){return a("animationName")};l.csscolumns=function(){return a("columnCount")};l.cssgradients=function(){var M="background-image:",L="gradient(linear,left top,right bottom,from(#9f9),to(white));",K="linear-gradient(left top,#9f9, white);";v((M+A.join(L+M)+A.join(K+M)).slice(0,-M.length));return o(C.backgroundImage,"gradient")};l.cssreflections=function(){return a("boxReflect")};l.csstransforms=function(){return !!h(["transformProperty","WebkitTransform","MozTransform","OTransform","msTransform"])};l.csstransforms3d=function(){var K=!!h(["perspectiveProperty","WebkitPerspective","MozPerspective","OPerspective","msPerspective"]);if(K&&"webkitPerspective" in G.style){K=d("@media ("+A.join("transform-3d),(")+"modernizr)")}return K};l.csstransitions=function(){return a("transitionProperty")};l.fontface=function(){var N,M=j||G,O=w.createElement("style"),K=w.implementation||{hasFeature:function(){return false}};O.type="text/css";M.insertBefore(O,M.firstChild);N=O.sheet||O.styleSheet;var L=K.hasFeature("CSS2","")?function(R){if(!(N&&R)){return false}var P=false;try{N.insertRule(R,0);P=!(/unknown/i).test(N.cssRules[0].cssText);N.deleteRule(N.cssRules.length-1)}catch(Q){}return P}:function(P){if(!(N&&P)){return false}N.cssText=P;return N.cssText.length!==0&&!(/unknown/i).test(N.cssText)&&N.cssText.replace(/\r+|\n+/g,"").indexOf(P.split(" ")[0])===0};I._fontfaceready=function(P){P(I.fontface)};return L('@font-face { font-family: "font"; src: "font.ttf"; }')};l.video=function(){var M=w.createElement("video"),K=!!M.canPlayType;if(K){K=new Boolean(K);K.ogg=M.canPlayType('video/ogg; codecs="theora"');var L='video/mp4; codecs="avc1.42E01E';K.h264=M.canPlayType(L+'"')||M.canPlayType(L+', mp4a.40.2"');K.webm=M.canPlayType('video/webm; codecs="vp8, vorbis"')}return K};l.audio=function(){var L=w.createElement("audio"),K=!!L.canPlayType;if(K){K=new Boolean(K);K.ogg=L.canPlayType('audio/ogg; codecs="vorbis"');K.mp3=L.canPlayType("audio/mpeg;");K.wav=L.canPlayType('audio/wav; codecs="1"');K.m4a=L.canPlayType("audio/x-m4a;")||L.canPlayType("audio/aac;")}return K};l.localstorage=function(){try{return("localStorage" in p)&&p.localStorage!==null}catch(K){return false}};l.sessionstorage=function(){try{return("sessionStorage" in p)&&p.sessionStorage!==null}catch(K){return false}};l.webWorkers=function(){return !!p.Worker};l.applicationcache=function(){return !!p.applicationCache};l.svg=function(){return !!w.createElementNS&&!!w.createElementNS(J.svg,"svg").createSVGRect};l.inlinesvg=function(){var K=w.createElement("div");K.innerHTML="<svg/>";return(K.firstChild&&K.firstChild.namespaceURI)==J.svg};l.smil=function(){return !!w.createElementNS&&/SVG/.test(z.call(w.createElementNS(J.svg,"animate")))};l.svgclippaths=function(){return !!w.createElementNS&&/SVG/.test(z.call(w.createElementNS(J.svg,"clipPath")))};function t(){I.input=(function(M){for(var L=0,K=M.length;L<K;L++){x[M[L]]=!!(M[L] in i)}return x})("autocomplete autofocus list placeholder max min multiple pattern required step".split(" "));I.inputtypes=(function(N){for(var M=0,L,K=N.length;M<K;M++){i.setAttribute("type",N[M]);L=i.type!=="text";if(L){i.value=F;if(/^range$/.test(i.type)&&i.style.WebkitAppearance!==m){G.appendChild(i);var O=w.defaultView;L=O.getComputedStyle&&O.getComputedStyle(i,null).WebkitAppearance!=="textfield"&&(i.offsetHeight!==0);G.removeChild(i)}else{if(/^(search|tel)$/.test(i.type)){}else{if(/^(url|email)$/.test(i.type)){L=i.checkValidity&&i.checkValidity()===false}else{L=i.value!=F}}}}e[N[M]]=!!L}return e})("search tel url email datetime date month week time datetime-local number range color".split(" "))}for(var k in l){if(q(l,k)){B=k.toLowerCase();I[B]=l[k]();D.push((I[B]?"":"no-")+B)}}if(!I.input){t()}I.crosswindowmessaging=I.postmessage;I.historymanagement=I.history;I.addTest=function(K,L){K=K.toLowerCase();if(I[K]){return}L=!!(L());G.className+=" "+(L?"":"no-")+K;I[K]=L;return I};v("");E=f=null;if(y&&p.attachEvent&&(function(){var K=w.createElement("div");K.innerHTML="<elem></elem>";return K.childNodes.length!==1})()){(function(U,Y){var K="abbr|article|aside|audio|canvas|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",P=K.split("|"),N=P.length,L=new RegExp("(^|\\s)("+K+")","gi"),R=new RegExp("<(/*)("+K+")","gi"),W=new RegExp("(^|[^\\n]*?\\s)("+K+")([^\\n]*)({[\\n\\w\\W]*?})","gi"),Z=Y.createDocumentFragment(),S=Y.documentElement,X=S.firstChild,M=Y.createElement("body"),Q=Y.createElement("style"),T;function O(ab){var aa=-1;while(++aa<N){ab.createElement(P[aa])}}function V(ae,ac){var ab=-1,aa=ae.length,af,ad=[];while(++ab<aa){af=ae[ab];if((ac=af.media||ac)!="screen"){ad.push(V(af.imports,ac),af.cssText)}}return ad.join("")}O(Y);O(Z);X.insertBefore(Q,X.firstChild);Q.media="print";U.attachEvent("onbeforeprint",function(){var ab=-1,ae=V(Y.styleSheets,"all"),ad=[],ag;T=T||Y.body;while((ag=W.exec(ae))!=null){ad.push((ag[1]+ag[2]+ag[3]).replace(L,"$1.iepp_$2")+ag[4])}Q.styleSheet.cssText=ad.join("\n");while(++ab<N){var ac=Y.getElementsByTagName(P[ab]),af=ac.length,aa=-1;while(++aa<af){if(ac[aa].className.indexOf("iepp_")<0){ac[aa].className+=" iepp_"+P[ab]}}}Z.appendChild(T);S.appendChild(M);M.className=T.className;M.innerHTML=T.innerHTML.replace(R,"<$1font")});U.attachEvent("onafterprint",function(){M.innerHTML="";S.removeChild(M);S.appendChild(T);Q.styleSheet.cssText=""})})(p,w)}I._enableHTML5=y;I._version=g;G.className=G.className.replace(/\bno-js\b/,"")+" js";G.className+=" "+D.join(" ");return I})(this,this.document);function css_browser_selector(p){var a=p.toLowerCase(),j=function(b){return a.indexOf(b)>-1},k="gecko",n="webkit",q="safari",d="opera",e="mobile",i=document.documentElement,l=[(!(/opera|webtv/i.test(a))&&/msie\s(\d)/.test(a))?("ie ie"+RegExp.$1):j("firefox/2")?k+" ff2":j("firefox/3.5")?k+" ff3 ff3_5":j("firefox/3.6")?k+" ff3 ff3_6":j("firefox/3")?k+" ff3":j("gecko/")?k:j("opera")?d+(/version\/(\d+)/.test(a)?" "+d+RegExp.$1:(/opera(\s|\/)(\d+)/.test(a)?" "+d+RegExp.$2:"")):j("konqueror")?"konqueror":j("blackberry")?e+" blackberry":j("android")?e+" android":j("chrome")?n+" chrome":j("iron")?n+" iron":j("applewebkit/")?n+" "+q+(/version\/(\d+)/.test(a)?" "+q+RegExp.$1:""):j("mozilla/")?k:"",j("j2me")?e+" j2me":j("iphone")?e+" iphone":j("ipod")?e+" ipod":j("ipad")?e+" ipad":j("mac")?"mac":j("darwin")?"mac":j("webtv")?"webtv":j("win")?"win"+(j("windows nt 6.0")?" vista":""):j("freebsd")?"freebsd":(j("x11")||j("linux"))?"linux":"","js"];c=l.join(" ");i.className+=" "+c;return c}css_browser_selector(navigator.userAgent);function css_loading_start(){var a=document.documentElement;a.className+=" js-loading"}css_loading_start();