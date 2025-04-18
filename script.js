//FIX SGL AND QUERY !|& -=~<>
const loadName =        document.getElementById('load-name');
const loadPass =        document.getElementById('load-pass');
const mainPad =         document.getElementById('main-pad');
const graphQuery =      document.getElementById('graph-query');
const graphResults =    document.getElementById('graph-results');
const chatContext =     document.getElementById('chat-context');
const chatPad =         document.getElementById('chat-pad'); //REFACTOR THIS TO CHATCONTENT CAUSE IT RHYMES
const chatKey =         document.getElementById('chat-key');
const chatModel =       document.getElementById('chat-model');
const searchQuery =     document.getElementById('search-query');
const searchGraphWarp = document.getElementById('search-graph-warp');
const searchSingleton = document.getElementById('search-singleton');
const tempPad =         document.getElementById("temp-pad");
const fragmentResults = document.getElementById('fragment-results');
const finalPad =        document.getElementById('final-pad');
const crossOrigin =     true;

async function load() {
  let loadNames=loadName.value.split(" ");
  puff = [];
  for (const loadName of loadNames) {
    let mist = new ProtectedTextApi(loadName, loadPass.value)
    puff.push(mist);
    await mist.loadTabs();
    debuglog('openedtext');
    debuglog(loadName);
  }
  cloud = puff;
  mainPad.value = '';
  for (const mist of cloud) {
    //mainPad.value += mist.view() + `\n||fileend ${mist.site_id}|${mist.siteHash}\n`;
    //mainPad.value += mist.view() + `\n# #fileend #${mist.site_id} ${mist.siteHash}\n`;
    mainPad.value += mist.view() + `\n# [[fileend]] [[${mist.site_id}]] ${mist.siteHash}\n`;
    debuglog('loadedtext');
    debuglog(mist.site_id);
  }
  debuglog('changedtext');  
}
function save() {
  debuglog("Trying to save...");
  if (finalPad.value == "") {
    debuglog("text area empty! Refusing to save.");
    return;
  }
  //let separators = cloud.map(mist => `\n||fileend ${mist.site_id}|${mist.siteHash}\n`);
  //let separators = cloud.map(mist => `\n# #fileend #${mist.site_id} ${mist.siteHash}\n`);
  let separators = cloud.map(mist => `\n# [[fileend]] [[${mist.site_id}]] ${mist.siteHash}\n`);
  let splitText = separators.reduce((acc, separator) => {
      let [before, ...after] = acc.pop().split(separator);
      return [...acc, before, ...after];
  }, [finalPad.value]);
  //debuglog(splitText);
  cloud.forEach((puff,i)=>setTimeout(
    ()=>puff.save(splitText[i]),
    i*2*1000
  ));
}
class ProtectedTextApi {
  constructor(site_id, passwd) {
    this.site_id = site_id;
    this.siteHash = CryptoJS.SHA512("/" + site_id).toString();
    this.pass = passwd;
    this.passHash = CryptoJS.SHA512(passwd).toString();
    this.endpoint = "https://www.protectedtext.com".concat("/", site_id);
    this.siteObj = {};
    this.dbversion = 0;
  }
  async loadTabs() {
    let url;
    if (crossOrigin)
      //CHANGED TO WORK WITH LIBRARY COMPUTERS
      //const url = `https://api.allorigins.win/raw?url=` + `${this.endpoint}?action=getJSON&dummy=${Date.now()}`;
      url = 'https://corsproxy.io/?' + encodeURIComponent(`${this.endpoint}?action=getJSON&dummy=${Date.now()}`);
    else
      url = `${this.endpoint}?action=getJSON&dummy=${Date.now()}`;
    const response = await fetch(url);
    this.siteObj = await response.json();
    this.dbversion = this.siteObj['currentDBVersion'];
    this.rawtext = CryptoJS.AES.decrypt(this.siteObj['eContent'], this.pass).toString(CryptoJS.enc.Utf8);
    // Remove SHA2-512 HASH added after user's content
    //debuglog(`${this.site_id}`);
    //debuglog(this.siteHash);
    //debuglog(CryptoJS.SHA512(`/${this.site_id}`).toString());
    //debuglog(this.rawtext.substring(this.rawtext.length - 128));
    let separator=CryptoJS.SHA512("-- tab separator --").toString();
    this.rawtext = this.rawtext.substring(0, (this.rawtext.length - 128));
    //debuglog(this.rawtext);
  }
  view() {
    try {
      return this.rawtext;
    } catch (err) {
      debuglog('error!')
      debuglog(err.message);
    }
  }
  //there is a limit to save file size
  async save(textToSave) {
    const encript = String(textToSave + this.siteHash);
    var textEncrypted = await CryptoJS.AES.encrypt(encript, this.pass).toString();
    const postdata = new URLSearchParams();
    postdata.append("initHashContent", this.getWritePermissionProof(this.rawtext));
    postdata.append("currentHashContent", this.getWritePermissionProof(textToSave));
    postdata.append("encryptedContent", textEncrypted);
    postdata.append("action", "save");
    const clientHeaders = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36`
      },
      body: postdata
    };
    var ret = undefined;
    try {
      let url;
      if (crossOrigin)
        //const url = 'https://corsproxy.io/?' + encodeURIComponent(this.endpoint);
        url = 'https://cors-proxy.fringe.zone/' + this.endpoint;
      else
        url = this.endpoint;
      const response = await fetch(url, clientHeaders);
      if (response.headers.get('Content-Type') === 'application/json') {
        ret = await response.json();
        if (ret.status === "success") {
          debuglog("Save succeeded!");
        } else {
          if (ret.message) {
            debuglog("Failed! " + ret.message);
          } else if (ret.expectedDBVersion && this.dbversion < ret.expectedDBVersion) {
            this.dbversion = ret.expectedDBVersion;
            await this.save(textToSave); // retry with newer version
          } else {
            debuglog("Text was changed in the meantime, save failed!");
          }
        }
      } else {
        debuglog(await response.text());
      }
    } catch (err) {
      debuglog("Save failed! Error");
      debuglog(err.message);
    }
    this.rawtext = textToSave;
    return (ret['status'] == 'success');
  }
  async deleteSite() {
    var inithashcontent = this.getWritePermissionProof(this.rawtext);
    const deleteAction = new URLSearchParams();
    deleteAction.append("initHashContent", inithashcontent);
    deleteAction.append("action", "delete");
    const response = await fetch(this.endpoint, {
      method: 'POST',
      body: deleteAction
    });
    const data = await response.json();
    return data['status'] == 'success';
  }
  getWritePermissionProof(content) {
    return (this.dbversion == 1) ?
      CryptoJS.SHA512(content).toString() :
      CryptoJS.SHA512(content + this.passHash).toString() + this.dbversion
  }
};
function uploadContent() {
  // Create a temporary file input element
  const tempInput = document.createElement('input');
  tempInput.type = 'file';
  tempInput.onchange = function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        // Populate the textarea with the file content
        document.getElementById('main-pad').value = e.target.result;
      };
      reader.readAsText(file);
    }
    // Clean up: remove the temporary input after use
    tempInput.remove();
  };
  // Trigger the file input to open the file dialog
  tempInput.click();
}
function downloadContent() {
  const content = document.getElementById('main-pad').value;
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const loadNameValue = document.getElementById('load-name').value;
  const d = new Date();
  const timestamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  a.download = loadNameValue ? `${timestamp}_${loadNameValue}.txt` : `${timestamp}_slab2d.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function downoadTime(text, ext) {
  const blob = new Blob([text], { type: 'text/'+ext });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const loadNameValue = document.getElementById('load-name').value;
  const d = new Date();
  const timestamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  a.download = loadNameValue ? `${loadNameValue}_${timestamp}.${ext}` : `download.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function recycle() {
  mainPad.value=finalPad.value;
  resetText(0,1,1,0);
}
function resetText(u,d,t,q) {
  if (u) mainPad.value='';
  if (d) fragmentResults.innerHTML = '';
  if (t) finalPad.value = '';
  if (q) cloud = new ProtectedTextApi(" "," "), loadName.value = loadPass.value = '';
}
function tagChopper(tag) {
  const spots = ['-', '.', '/', '_', '~', '#'].
    map(sep => tag.indexOf(sep)).
    filter(index => index !== -1);
  const first = Math.min(...spots);
  return isNaN(first)
    ? [tag, '', '']
    : [tag.slice(0, first), tag[first], tag.slice(first + 1)];
}
function searchText(query) {
  let results=[];
  const lines = mainPad.value.split('\n');
  //debuglog(lines);
  // If search bar is empty, return
  if (query === '') return;
  // Initialize a variable to hold the current parent note
  //var currentParentNote = null;
  // Initialize a variable to hold the current note (parent or subnote)
  // Loop through each line
  var hidden = true;
  for (var i = 0; i < lines.length; i++) {
    var metadata = extractMetadata(lines[i]);
    // If the note is a parent note (has a date or tags), update the current parent note
    if (metadata.date || metadata.tags.length > 0) {
      // If the line contains the search text, add it to the search results
      hidden=!evaluateAst(parseQuery(query), lines[i], {
        ...metadata,
        tags: metadata.tags.map(
          tag => tagChopper(tag)[0].
          toLowerCase()
        )
      });
      results.push([[i],hidden,[metadata.date,metadata.tags]]);
    } else {
      // If the line is a subnote, add it to the current note
      results.at(-1)[0].push(i);
    }
  }
  return [lines,results];
}
function dumpNotes() {
  debuglog(searchText(' '));
}
function opml() {
  // Step 1: Search text and get lines and results
  let [lines, results] = searchText(' ');
  // Step 2: Process results to get tags and note lines
  let processedResults = results.map(function([noteLines, hidden, metadata]) {
    let tags = metadata[0] !== null ? [...metadata[1], metadata[0]] : metadata[1];
    let noteLinesProcessed = noteLines.map(function(i) {
      return lines[i];
    }).map(function(line, j) {
      return j === 0 ? extractMetadata(line).content : line;
    });
    return [tags, noteLinesProcessed];
  });
  // Step 3: Format the processed results
  let formattedResults = processedResults.map(function([tags, noteLines]) {
    let firstLine = [noteLines[0], ...tags.map(function(tag) {
      return '#' + tag;
    })].join(' ');
    return [firstLine.trim(), ...noteLines.slice(1)];
  });
  debuglog(formattedResults);
  let indentedResults = formattedResults.map((paragraph) => {
    const result = [];
    for (const line of paragraph) {
      let level = line.search(/\S/);
      if (level === -1)
        level = result.at(-1)?.level ?? 0;
      const text = line.trim();
      result.push({ text, level });
    }
    return result;
  });
  debuglog(indentedResults);
  let nestedResults = indentedResults.map((lines) => {
    function ttreeToJson(ttree, level = 0) {
      const result = [];
      for (let i = 0; i < ttree.length; i++) {
        const cn = ttree[i];
        const nn = ttree[i + 1] || { level: -1 };

        if (cn.level > level) continue;
        if (cn.level < level) return result;

        const node = { text: cn.text, children: [] };
        if (nn.level === level) {
          result.push(node);
        } else if (nn.level > level) {
          const rr = ttreeToJson(ttree.slice(i + 1), nn.level);
          node.children = rr;
          result.push(node);
        } else {
          result.push(node);
          return result;
        }
      }
      return result;
    }
    debuglog(lines[0]);
    return [{text: lines.shift().text,children: ttreeToJson(lines)}];
  });
  tempPad.value=debuglog(nestedResults);
  const parser = new DOMParser();
  //debuglog("Parser created");
  const xmlDoc = parser.parseFromString('<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head></head><body></body></opml>', 'application/xml');
  //debuglog("XML Doc created");
  const bodyElement = xmlDoc.querySelector('body');
  //debuglog("Body element found:", bodyElement);
  function addOutlineElements(parentElement, items) {
    //debuglog("Adding outline elements to:", parentElement);
    items.forEach(item => {
      //debuglog("Processing item:", item);
      const outlineElement = xmlDoc.createElement('outline');
      outlineElement.setAttribute('text', item.text);
      parentElement.appendChild(outlineElement);
      //debuglog("Outline element added:", outlineElement);
      if (item.children) {
        //debuglog("Item has children, recursing...");
        addOutlineElements(outlineElement, item.children);
      }
    });
  }
  nestedResults.forEach(item => {
    //debuglog("Processing nested result:", item);
    addOutlineElements(bodyElement, item);
  });
  const serializer = new XMLSerializer();
  //debuglog("Serializer created");
  let opmlResult = serializer.serializeToString(xmlDoc);
  //debuglog("OPML Result:", opmlResult);
  //tempPad.value = opmlResult;
  
  const blob = new Blob([opmlResult], { type: 'text/opml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const loadNameValue = document.getElementById('load-name').value;
  const d = new Date();
  const timestamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  a.download = loadNameValue ? `${loadNameValue}_${timestamp}.opml` : 'download.opml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function ideaflow() {
  let [lines, results] = searchText(' ');
  tempPad.value = results.map(function([noteLines, hidden, metadata]) {
    let tags = metadata[0] !== null ? [...metadata[1], metadata[0]] : metadata[1];
    let noteLinesProcessed = noteLines.map(function(i) {
      return lines[i];
    }).map(function(line, j) {
      return j === 0 ? extractMetadata(line).content : line;
    });
    return [tags, noteLinesProcessed];
  }).map(function([tags, noteLines]) {
    let firstLine = [noteLines[0], ...tags.map(function(tag) {
      return '#' + tag;
    })].join(' ');
    let restLines = noteLines.slice(1).join('\n');
    return [firstLine, restLines].join('\n');
  }).join('\n--\n');
}
function extractMetadataTriplet(note) {
  var metadata = {
    date: null,
    tags: [],
    content: note
  };
  //pass;console.log("#########################");
  //pass;console.log(JSON.stringify(note));
  let add="";
  if (note.startsWith('|')) {
    let tribar = new RegExp('^\\|([^\\|]*)\\|([^\\|]*)\\|');
    matches=note.match(tribar);
    if (matches) {
      //console.log('YB');
      //console.log(JSON.stringify(matches));
      if (matches[1]) {
        if (!isNaN(matches[1].replace(/\D/g, ''))) {
          metadata.date=matches[1];
        }
      }
      if (matches[2]) {
        add='tribar';
        metadata.tags=matches[2].
          split(' ').
          filter(Boolean);
      }
      metadata.content = note.substring(matches[0].length);
    }
    else {
      1;//console.log('NB');
    }
  }
  else {
    let trispc = new RegExp('(\\S+( \\S)*)? {3}\\S.*');
    matches=note.match(trispc);
    if (matches) {
      //console.log('YS');
      add='trispc';
      metadata.content = note.substring(matches[0].length);
      //console.log(JSON.stringify(matches));
    }
    else {
      1;//console.log('NS');
    }
  }
  metadata.tags=metadata.tags.filter(Boolean);
  /*if (metadata.tags.length) {
    debuglog(metadata.tags);
  }*/
  return metadata;
}
function TripletToMarkDown() {
  // Step 1: Search text and get lines and results
  let [lines, results] = searchText(' ');
  // Step 2: Process results to get tags and note lines
  let processedResults = results.map(function([noteLines, hidden, metadata]) {
    let date = metadata[0];
    let tags = metadata[1];
    let noteLinesProcessed = noteLines.map(function(i) {
      return lines[i];
    }).map(function(line, j) {
      return j === 0 ? extractMetadata(line).content : line;
    });
    return [date, tags, noteLinesProcessed];
  });
  // Step 3: Format processed results into Markdown
  let formattedResults = processedResults.map(function([date, tags, noteLines]) {
    let firstLine = [
      '#', 
      //...(date ? [`#date/${date}`] : []),
      //...tags.map(tag=>(([a,b,c])=>`#${a}${(c)?'/'+c:''}`)(tagChopper(tag))),
      ...(date ? [`[[date#${date}]]`] : []),
      ...tags.map(tag=>(([a,b,c])=>`[[${a}${(c)?'#'+c:''}]]`)(tagChopper(tag))),
      ...(noteLines[0] ? [noteLines[0]] : [])
    ].join(' ');
    return [
      firstLine, 
      ...noteLines.slice(1)
    ].join('\n');
  });
  // Step 4: Join Markdown and update the result
  let markDown = formattedResults.join('\n');
  mainPad.value = markDown;
}
function extractMetadataMarkdown(note) {
  const metadata = {
    date: null,
    tags: [],
    content: note
  };
  //const regex = /^#\s((#[^\s]+\s)+)(.*?)$/;
  //const regex = /^#\s((\[\[[^\s]+\]\]\s)+)(.*?)$/;
  //const regex = /^#\s((\[\[[^\s]+\]\]\s*)+)(.*?)$/;
  const regex = /^#((\s\[\[[^\s]+\]\])+)(?:\s(.*))?$/;
  //const regex = /^#((\s\[\[[^\s]+\]\])+)(\s(.*))?$/;
  const match = note.match(regex);
  if (match) {
    let tags = match[1].
      split(/\s+/).
      filter(Boolean).
        map(tag => tag.
          //replace(/^#/, '')
          slice(2, -2)
      );
    for (let i = 0; i < tags.length; i++) {
      //if (/^date\//.test(tags[i])) {
      if (/^date#/.test(tags[i])) {
        metadata.date = tagChopper(tags[i])[2];
        tags.splice(i, 1);
        break;
      }
    }
    metadata.tags = tags;
    metadata.content = match[3] || "";
  }
  //console.log(metadata);
  return metadata;
} let extractMetadata=extractMetadataMarkdown;
function MarkDownToTriplet() {
  // Step 1: Parse the Markdown into lines and split into sections
  let [lines, results] = searchText(' ');
  // Step 2: Process results to extract metadata and content
  let processedResults = results.map(function([noteLines, hidden, metadata]) {
    let date = metadata[0];
    let tags = metadata[1].map(tag=>(([a,b,c])=>`${a}${(c)?'_'+c:''}`)(tagChopper(tag)));
    let noteLinesProcessed = noteLines.
      map(i => lines[i]).
      map(function(line, j) {
        return j === 0 ? extractMetadata(line).content : line;
      }
    );
    return [date, tags, noteLinesProcessed];
  });
  // Step 3: Format processed results into triplets
  let formattedResults = processedResults.map(function([date, tags, noteLines]) {
    let firstLine = `|${date||''}|${tags.join(' ')||''}|`;
    let content = noteLines.join('\n');
    return `${firstLine}${content}`;
  });
  // Step 4: Join triplets and update the result
  let tripletText = formattedResults.join('\n');
  mainPad.value = tripletText;
}
// Update downloadObsidianZip function to handle async hash calculation
async function downloadObsidianZip() {
  console.log("1");
  // --- INSERTION 1 ---
    const _timer_start = performance.now();
    debuglog("Creating Markdown zip...");
  const zip = new JSZip();
  // Step 1: Search text and get lines and results
  let [lines, results] = searchText(' ');
  // Create a hashSet to track used hashes and handle collisions
  const usedHashes = new Set();
  // Step 2: Process results to get tags and note lines
  let processedResults = results.map(function([noteLines, hidden, metadata]) {
    let date = metadata[0];
    let tags = metadata[1];
    let noteLinesProcessed = noteLines.map(function(i) {
      return lines[i];
    }).map(function(line, j) {
      return j === 0 ? extractMetadata(line).content : line;
    });
    return [date, tags, noteLinesProcessed];
  });
  // --- INSERTION 2 ---
    const _timer_after_preprocess = performance.now();
    debuglog(`TIMER: Preprocessing took ${(_timer_after_preprocess - _timer_start).toFixed(2)} ms`);
  // Step 3: Format processed results into Markdown and create file
  for (let index = 0; index < processedResults.length; index++) {
    console.log("2");
    const [date, tags, noteLines] = processedResults[index];
    // Match title only from beginning of the line
    let title = null;
    const titleMatch = noteLines[0].match(/^`([^`]+)`(?:\s(.*))?$/);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim().replace(/[\/\\:*?"<>|]/g, '_'); // Remove invalid filename characters
      noteLines[0] = titleMatch[2] || "";
    }
    // Create first line with all metadata
    console.log("3");
    let firstLine = [
      '#',
      //...(date ? [`#date/${date}`] : []),
      //...tags.map(tag=>(([a,b,c])=>`#${a}${(c)?'/'+c:''}`)(tagChopper(tag))),
      `[[file#${index + 1}]]`, //Inject file order metadata
      ...(date ? [`[[date#${date}]]`] : []),
      ...tags.map(tag=>(([a,b,c])=>`[[${a}${(c)?'#'+c:''}]]`)(tagChopper(tag))),
      ...(noteLines[0] ? [noteLines[0]] : [])
    ].join(' ');
    // Format the complete note
    const formattedNote = [
      firstLine,
      ...noteLines.slice(1)
    ].join('\n');
    const hashNote = [
      firstLine.replace(/\[\[file#\d+\]\]\s*/, ''),
      ...noteLines.slice(1)
    ].join('\n');
    console.log("4");
    // Use Blake3 from hash-wasm
    let hash = await hashwasm.xxhash64(hashNote);
    // Handle hash collisions, increment the hash if collision occurs
    while (usedHashes.has(hash)) {
      hash = BigInt(`0x${hash}`);
      hash++;
      hash = hash % (16n**16n);
      hash = hash.toString(0x10).padStart(16, '0');
    }
    console.log("5");
    usedHashes.add(hash);
    // Use title if available, otherwise use hash-based name
    const filename = title ? `${title}` : `hash_${hash}`;
    // Add file to zip
    zip.file(filename + `.md`, formattedNote);
  }
  console.log("6");
  // --- INSERTION 3 ---
    const _timer_after_loop = performance.now();
    debuglog(`TIMER: Main loop took ${(_timer_after_loop - _timer_after_preprocess).toFixed(2)} ms`);
  // Generate timestamp and filename for the zip
  const d = new Date();
  const timestamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  const loadNameValue = document.getElementById('load-name').value;
  const zipFilename = loadNameValue ? `${timestamp}_${loadNameValue}` : `${timestamp}_slab2d`;

  // --- INSERTION 4 ---
    debuglog("TIMER: Starting zip generation...");
  // Generate the zip and trigger download
  zip.generateAsync({
    type: "blob",
    compression: "STORE" // No compression, raw storage for maximum speed
  })
    .then(function(content) {
      // --- INSERTION 5 ---
        const _timer_after_zipgen = performance.now();
        debuglog(`TIMER: Zip generation took ${(_timer_after_zipgen - _timer_after_loop).toFixed(2)} ms`);
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipFilename + ".zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // --- INSERTION 6 ---
        const _timer_end_success = performance.now();
        debuglog(`TIMER: SUCCESS - Total time ${(_timer_end_success - _timer_start).toFixed(2)} ms`);
    })
    // --- INSERTION 7 ---
      .catch(function(error) { const _timer_end_error = performance.now(); debuglog("Error during zip generation or download:", error); debuglog(`TIMER: FAILURE - Total time until error ${(_timer_end_error - _timer_start).toFixed(2)} ms`); });
}
/*
<VAULT>/.obsidian/plugins/uploadslab2dtxt/main.js
```main.js
const { Plugin, Notice, normalizePath } = require('obsidian');

class UploadSlab2DTxt extends Plugin {
  async onload() {
    console.log('Loading UploadSlab2DTxt plugin');
    // Add ribbon icon
    this.addRibbonIcon('upload', 'Convert to Slab2D', () => {
      this.convertVaultToSlab2D();
    });
    // Add command
    this.addCommand({
      id: 'convert-to-slab2d',
      name: 'Convert Vault to Slab2D format',
      callback: () => this.convertVaultToSlab2D()
    });
    console.log('Loaded UploadSlab2DTxt plugin');
  }

  async convertVaultToSlab2D() {
    try {
      console.log('Ensuring export folder');
      // Create exports folder if it doesn't exist
      const exportFolder = 'exports';
      const exportFolderPath = normalizePath(exportFolder);
      if (!await this.app.vault.adapter.exists(exportFolderPath)) {
        await this.app.vault.createFolder(exportFolderPath);
      }
      console.log('Grabbing MDs');
      const files = this.app.vault.getMarkdownFiles();
      const entries = [];
      // Process each file into entries
      for (const file of files) {
        console.log('Processng file');
        //WHY THE FUCK IS THIS HERE, "GRACEFUL" ERROR HANDLING, WHICH US FUCKING QUIET COMING LIKE A FREIGHT TRAIN TO SABTOGE MY LIFE BY OMMITTING SHIT QUIETLY, FUCKING GET RID OF THIS SHIT!!!
        //I got rid of evil try catch block
        const content = await this.app.vault.read(file);
        const [processedContent, fileNum] = this.convertObsidianToSlab2D(content, file.basename);
        entries.push({
          fileNum: fileNum,
          content: processedContent
        });
      }
      console.log('Sorting notes');
      // Sort entries by file number, with JSON fallback
      entries.sort((a, b) => {
        if (a.fileNum === b.fileNum)
          return JSON.stringify(a).localeCompare(JSON.stringify(b));
        else
          return a.fileNum<b.fileNum ? -1 : 1;
      });
      console.log('Fusing into monolith');
      // Join all entries with proper line breaks
      let slab2dContent = entries.map(entry => entry.content).join('\n');
      // Generate timestamp in the format YYYYMMDDHHMMSS
      const d = new Date();
      const timestamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
      // Create the output file path within the exports folder
      const outputFileName = `${timestamp}_obsidian.txt`;
      const outputFilePath = normalizePath(`${exportFolder}/${outputFileName}`);
      // Create the file
      await this.app.vault.create(outputFilePath, slab2dContent);
      new Notice(`Converted to Slab2D format and saved as ${outputFileName} in the exports folder!`);
    } catch (err) {
      console.error("Error converting to Slab2D:", err);
      new Notice("Error converting to Slab2D. Check console for details.");
    }
  }

  // ----- ALMOST EXACT COPY FROM SLAB2D WEBAPP -----
  tagChopper(tag) {
    const spots = ['-', '.', '/', '_', '~', '#'].
      map(sep => tag.indexOf(sep)).
      filter(index => index !== -1);
    const first = Math.min(...spots);
    return isNaN(first)
      ? [tag, '', '']
      : [tag.slice(0, first), tag[first], tag.slice(first + 1)];
  }

  extractMetadataMarkdown(note) {
    const metadata = {
      date: null,
      tags: [],
      content: note
    };
    //const regex = /^#\s((#[^\s]+\s)+)(.*?)$/;
    //const regex = /^#\s((\[\[[^\s]+\]\]\s)+)(.*?)$/;
    //const regex = /^#\s((\[\[[^\s]+\]\]\s*)+)(.*?)$/;
    const regex = /^#((\s\[\[[^\s]+\]\])+)(?:\s(.*))?$/;
    //const regex = /^#((\s\[\[[^\s]+\]\])+)(\s(.*))?$/;
    const match = note.match(regex);
    if (match) {
      let tags = match[1].
        split(/\s+/).
        filter(Boolean).
          map(tag => tag.
            //replace(/^#/, '')
            slice(2, -2)
        );
      for (let i = 0; i < tags.length; i++) {
        //if (/^date\//.test(tags[i])) {
        if (/^date#/.test(tags[i])) {
          metadata.date = this.tagChopper(tags[i])[2];
          tags.splice(i, 1);
          break;
        }
      }
      metadata.tags = tags;
      metadata.content = match[3] || "";
    }
    return metadata;
  }

  convertObsidianToSlab2D(markdownContent, filename) {
    // Split content into lines
    const lines = markdownContent.split('\n');
    const firstLine = lines[0];
    
    // Extract metadata from first line
    const metadata = this.extractMetadataMarkdown(firstLine);
    
    // Extract the file number
    let fileNum = -Infinity; // Default if not found
    const fileTag = metadata.tags.find(tag => tag.startsWith('file#'));
    if (fileTag) {
      fileNum = parseInt(this.tagChopper(fileTag)[2], 10);
      // Remove file tag from tags array
      metadata.tags = metadata.tags.filter(tag => !tag.startsWith('file#'));
    }
    
    let formattedFirstLine = [
      '#',
      ...(metadata.date ? [`[[date#${metadata.date}]]`] : []),
      ...metadata.tags.map(tag=>(([a,b,c])=>`[[${a}${(c)?'#'+c:''}]]`)(this.tagChopper(tag))),
      ...(!(
          /^hash_[0-9A-F]{8}$/i.test(filename.replace(/\.md$/, ''))
            ||
          /^hash_[0-9A-F]{16}$/i.test(filename.replace(/\.md$/, ''))
            ||
          /^file_\d+$/.test(filename.replace(/\.md$/, ''))
         )
         ? 
         [`\`${filename.replace(/\.md$/, '')}\``] : []
      ),
      ...(metadata.content ? [metadata.content] : [])
    ].join(' ');
    
    // Rebuild the content with the formatted first line
    let formattedResult = [
      formattedFirstLine,
      ...lines.slice(1)
    ].join('\n');
    
    return [formattedResult, fileNum];
  }

  onunload() {
    console.log('Unloading UploadSlab2DTxt plugin');
  }
}

module.exports = UploadSlab2DTxt;
```
<VAULT>/.obsidian/plugins/uploadslab2dtxt/manifest.json
```manifest.json
{
  "id": "uploadslab2dtxt",
  "name": "UploadSlab2DTxt",
  "version": "1.0.0",
  "minAppVersion": "0.12.0",
  "description": "Converts Obsidian notes back to Slab2D format",
  "author": "YourName",
  "isDesktopOnly": false
}
```
*/
function evaluateAst(ast, note, metadata) { //judge note against AST
  // Check if all tags in the AST are included in the note's metadata tags
  return ast.normal.some(tag => metadata.tags.includes(tag)) && 
         !ast.neg.some(tag => metadata.tags.includes(tag)) &&
         ast.pos.every(tag => metadata.tags.includes(tag));
}
function parseQuery(query) { //turn query into AST
  // Split the query into words
  let words = query.split(' ').filter(Boolean);
  // Convert the words to lowercase and return them as tags
  let tags = words.map(word => word.toLowerCase());
  let normal=[], pos=[], neg=[];
  tags.forEach(item => {
    if (item.startsWith('-')) neg.push(item.slice(1));
    else if (item.startsWith('+')) pos.push(item.slice(1))
    else normal.push(item);
  });
  return {normal, pos, neg};
}
function searchNotesAndDisplay() {
  if (searchGraphWarp.checked) {
    searchQuery.value=graphWarp(searchQuery.value);
  }
  debuglog('searching and displaying notes');
  fragmentResults.innerHTML = '';
  let [lines,results]=searchText(searchQuery.value);
  results.map(([currentNote,hidden])=>
    addNoteToSearchResults(currentNote,hidden,lines));
}
function addNoteToSearchResults(noteLines, hidden, lines) {
  // Create a textarea for the note
  var textarea = document.createElement('textarea');
  textarea.value = noteLines.map(i => lines[i]).join('\n');
  textarea.style.display = hidden ? 'none' : 'block';
  // Adjust the textarea height whenever the user types
  var adjustTextareaMod = debounceAndThrottle(adjustTextareaHeight, 50, 200);
  textarea.oninput = function() {
    adjustTextareaMod(textarea);
  };
  fragmentResults.appendChild(textarea);
  // Adjust the textarea height to fit its content
  adjustTextareaHeight(textarea);
}
function adjustTextareaHeight(textarea, minRows=1, maxRows=Infinity) {
  var t = textarea;
  if (t.scrollTop == 0)
    t.scrollTop=1;
  while (t.scrollTop == 0) {
    if (t.rows > minRows)
      t.rows--;
    else
      break;
    t.scrollTop = 1;
    if (t.rows < maxRows)
      t.style.overflowY = "hidden";
    if (t.scrollTop > 0) {
      t.rows++;
      break;
    }
  }
  while(t.scrollTop > 0) {
    if (t.rows < maxRows) {
      t.rows++;
      if (t.scrollTop == 0)
        t.scrollTop=1;
    }
    else {
      t.style.overflowY = "auto";
      break;
    }
  }
  //https://stackoverflow.com/questions/17772260/textarea-auto-height
  /*
  // Create a hidden "shadow" div with the same width as the textarea
  var shadow = document.createElement('div');
  shadow.style.width = window.getComputedStyle(textarea).width;
  shadow.style.whiteSpace = 'pre-wrap';
  shadow.style.wordWrap = 'break-word';
  shadow.style.position = 'absolute';
  //shadow.style.visibility = 'hidden';
  shadow.style.height = 'auto';
  shadow.style.overflow = 'hidden';

  // Copy the textarea's value and styles to the shadow div
  shadow.textContent = textarea.value;
  shadow.style.padding = window.getComputedStyle(textarea).padding;
  shadow.style.border = window.getComputedStyle(textarea).border;
  shadow.style.fontSize = window.getComputedStyle(textarea).fontSize;
  shadow.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
  shadow.style.letterSpacing = window.getComputedStyle(textarea).letterSpacing;

  // Append the shadow div to the body (it won't be visible because it's absolutely positioned and has visibility: hidden)
  document.body.appendChild(shadow);

  // Calculate the required textarea height based on the shadow div's scrollHeight
  var newHeight = shadow.scrollHeight;

  // Remove the shadow div from the body
  document.body.removeChild(shadow);

  // Set the textarea's height
  textarea.style.height = newHeight + 'px';
  */
}
function debounceAndThrottle(func, debounceDelay, throttleDelay) {
  var timeoutId;
  var lastRun = 0;
  var scheduled = false;
  return function() {
    var now = Date.now();
    var context = this;
    var args = arguments;
    // If less than 200ms has passed since the last run, return
    if (now - lastRun < throttleDelay - debounceDelay) return;
    // If a timeout is already scheduled, return
    if (scheduled) return;
    // Schedule a timeout to run the function after the debounce delay
    scheduled = true;
    timeoutId = setTimeout(function() {
      func.apply(context, args); // Pass the arguments to func
      lastRun = Date.now();
      scheduled = false;
    }, debounceDelay);
  };
}
function combineFragments() {
  debuglog('combining text');
  finalPad.value = ''; // Clear the textarea
  var fragmentResults = document.getElementById('fragment-results');
  var textareas = fragmentResults.getElementsByTagName('textarea');
  for (var i = 0; i < textareas.length; i++) {
    finalPad.value += textareas[i].value + '\n';
  }
}
function combineFragmentsCram() {
  debuglog('bunching text');
  finalPad.value = ''; // Clear the textarea
  //???
  var fragmentResults = document.getElementById('fragment-results');
  var textareas = fragmentResults.getElementsByTagName('textarea');
  const visible = Array.from(textareas).filter(textarea => window.getComputedStyle(textarea).display !== 'none');
  const hidden = Array.from(textareas).filter(textarea => window.getComputedStyle(textarea).display === 'none');
  for (var i = 0; i < hidden.length; i++) {
    finalPad.value += hidden[i].value + '\n';
  }
  for (var i = 0; i < visible.length; i++) {
    finalPad.value += visible[i].value + '\n';
  }
}
function combineFragmentsCramUp() {
  debuglog('bunching text');
  finalPad.value = ''; // Clear the textarea
  //???
  var fragmentResults = document.getElementById('fragment-results');
  var textareas = fragmentResults.getElementsByTagName('textarea');
  const visible = Array.from(textareas).filter(textarea => window.getComputedStyle(textarea).display !== 'none');
  const hidden = Array.from(textareas).filter(textarea => window.getComputedStyle(textarea).display === 'none');
  for (var i = 0; i < visible.length; i++) {
    finalPad.value += visible[i].value + '\n';
  }
  for (var i = 0; i < hidden.length; i++) {
    finalPad.value += hidden[i].value + '\n';
  }
}
/*Graph class
Model of interconnected tags for ontology navigation. Tags are nodes. Relationships are edges.
Feed `addBinaryRelation` to build the graph.
`"green beings eat sunlight"~plant>vegetable=veggie=greens-fruit<(apple banana orange)`
getSuper('apple'): Returns 'fruit'.
  Operator: >. Gets superset tags.
getSub('fruit'): Returns ['apple', 'banana', 'orange'].
  Operator: <. Gets subset tags.
getEqual('veggie')> Returns ['vegetable', 'veggie', 'green'].
  Operator: =. Gets central tag synonym.
getLink('fruit'): Returns ['vegetables'].
  Operator: -. Gets related tags.
getComment('plant'): Returns "green beings eat sunlight".
  Operator: ~. get tag description.
*/
class Graph {
  constructor() {
    this.nodes = {};
    this.edges = [];
  }
  addEdge(left, operator, right) {
    const edgeAlreadyExists = this.edges.some(edge => 
      edge[0] === left && edge[2] === right && edge[1] === operator ||
      (operator === '-' && edge[0] === right && edge[2] === left && edge[1] === operator));
    if (!edgeAlreadyExists) {
      this.edges.push([left, operator, right]);
      let sided = operator==='-' ? '' : 'x';
      this.getOrMake(left).push({ [operator + sided]: right });
      this.getOrMake(right).push({ [sided + operator]: left });
    }
  }
  removeEdge(left, operator, right) {
    this.edges = this.edges.filter(edge => 
      !(edge[0] === left && edge[2] === right && edge[1] === operator) &&
      !(operator === '-' && edge[0] === right && edge[2] === left && edge[1] === operator));
    let sided = operator==='-' ? '' : 'x';
    this.nodes[left] = this.nodes[left].filter(rel => !(rel[operator + sided] === right));
    this.nodes[right] = this.nodes[right].filter(rel => !(rel[sided + operator] === left));
  }
  getOrMake(node) {
    return this.nodes[node] = this.nodes[node] || [];
  }
  addBinaryRelation(relation) { /// the input of add binary relation, might need to change.
    //console.log('adding', relation)
    const [left, operator, right] = relation; 
    if (operator === '~') {
      const existingComment = this.getOrMake(left).find(rel => '~' in rel);
      if (existingComment) {
        existingComment['~'] += '\n' + right;
      } else {
        this.nodes[left].push({ '~': right });
      }
      return;
    }
    this.getOrMake(left);
    this.getOrMake(right);
    const leftBase = this.getEqualDown(left);
    const rightBase = this.getEqualDown(right);
    if (operator === '=') {
      this.propagateEquality(leftBase,rightBase);
      this.propagateEquality(leftBase,right);
    }
    this.addEdge(leftBase, operator, rightBase);
  }
  propagateEquality(left, right) {
    this.nodes[right].forEach(relation => {
      for (const [op, target] of Object.entries(relation)) {
        if (op !== '~') {
          this.addEdge(left, op.replace('x', ''), target);
          this.removeEdge(right, op.replace('x', ''), target);
        }
      }
    });
  }
  getEqualDown(node) {
    const edges = this.getNodeEdges(node, 'x=');
    let returnval = edges.length && edges[0] !== node ? this.getEqualDown(edges[0]) : node;
    return returnval;
  }
  getEqualUp(node) {
    return this.getNodeEdges(node, '=x');
  }
  getEqual(node) {
    let base = this.getEqualDown(node);
    return [...new Set([...this.getEqualUp(base), base])];
  }
  getNodeEdges(nodeVal, operator) {
    return this.nodes[nodeVal]
      ?.filter(rel => rel.hasOwnProperty(operator))
      .map(rel => rel[operator]) || [];
  }
  getSuper(node) {
    return this.getNodeEdges(node, 'x>');
  }
  getSub(node) {
    return this.getNodeEdges(node, '>x');
  }
  getLink(node) {
    return this.getNodeEdges(node, '-');
  }
  getComment(node) {
    return this.getNodeEdges(node, '~')[0] || '';
  }
  dump () {
    console.log(this.nodes);
    console.log(this.edges);
  }
  /*reconstruct(node) {
    return this.nodes[node]?.map(nodeRel => {
      let [operator, target] = Object.entries(nodeRel)[0];
      return [
        operator.indexOf('x') ? target : node,
        operator.replace('x', ''),
        operator.indexOf('x') ? node : target  
      ];
    }) || [];
  }*/
}
function buildGraph(relations='') {
  debuglog("buidGraph");
  let results;
  if (!relations) {
    let [lines, rawResults] = searchText("tag");
    rawResults = rawResults.filter(([currentNote, hidden]) => !hidden);
    rawResults = rawResults.map(([currentNote]) => currentNote);
    rawResults = rawResults.map(linens => linens.map(linen => lines[linen]).join('\n'));
    results = rawResults.map(result => {
      //debuglog(result);
      let thing=simplifyGraphLang(result);
      //debuglog(thing);
      return thing;
    }).flat();
  } else {
    results = simplifyGraphLang(relations);
  }
  results = results.map(relation => relation.map(part => part instanceof Array ? part[0] : part));
  //.sort((a,b)=>(b[1]==='=')-(a[1]==='='));
  //debuglog(results);
  let graph = new Graph();
  for (let relation of results) {
    graph.addBinaryRelation(relation);
  }
  return graph;
}
async function extractTags(query = '') {
  //debuglog("1");
  const querys = query.split(" ");
  const [lines, results] = searchText(" ");
  const uniqueTags = new Set();
  for (const result of results) {
    const metadata = result[2];
    tags = metadata[1].map(tag=>tagChopper(tag)[0]);
    if (!query || querys.some(aquery => tags.includes(aquery))) {
      for (const tag of tags) {
        uniqueTags.add(tag);
      }
    }
  }
  graphResults.value = [...uniqueTags].join(' ');
}
function graphWarp(query) {
  let graph = buildGraph();
  //debuglog(graph);
  let operatorPattern = /([><=-]\w+)/g;
  return query.replace(
    operatorPattern, function(match) {
      let operator = match[0];
      let query = match.slice(1);
      if (operator==='>')
        return graph.getSuper(query).join(' ');
      if (operator==='<')
        return graph.getSub(query).join(' ');
      if (operator==='=')
        return graph.getEqual(query).join(' ');
      if (operator==='-')
        return graph.getLink(query).join(' ');
  });
}
function graphSearch(query, graph='') {
  /*graph = graph || buildGraph();
  let terms = query.split(" ");
  let matches = graph.edges.
    filter(edge => terms.some(term => 
      edge[0] === term || edge[2] === term));
  graphResults.value = matches.flat().map(edge => edge.join(" ")).join("\n");*/
  graphResults.value=graphWarp(query);
}
//SGL AND TAPE EATER HAVE A SERIOUS PROBLEM WITH NESTED ARRAYSS
function simplifyGraphLang(input) {
  let tape = input;
  let pancake = [];
  let operators = `<>=~-`;
  let prepostfix = `=-`;
  let left;   //for tokens, groups, or quotes
  let right;  //for tokens, groups, or quotes
  let center; //for operators
  let prefixflag;
  const reset = () => {
    left = null;
    right = null;
    center = null;
    prefixflag = false;
  }
  reset();
  //if multiline, split and recurse
  if (tape.includes(`\n`)) {
    pancake = input.split(`\n`).flatMap(simplifyGraphLang);
    tape = '';
  }
  while (tape) {
    [token, tape] = tapeEater(tape);
    //debuglog([token,tape]);
    //error is [] empty array
    //tags are [a b] array, even singles, even comments, even brackets
    //operators are "?" character
    if (token===[] || token===`,`) {
      reset(); continue;
    }
    //handle tags
    if(Array.isArray(token)) {
      if (!left && !center && !right) {
        left = token;
      }
      else if (!!left && !!center && !right) {
        right = token;
      }
      else if (!left && !!center && !right && prefixflag) {
        right = token;
      }
      else {
        reset(); continue;
      }
    }
    //handle operator
    else if (operators.includes(token)) {
    //else if (typeof obj === 'string' && token.length === 1 && operators.includes(token)) {
    //else if (operators.includes(token) && token.length === 1) {
      if (!left && !center && !right) {
        if (prepostfix.includes(token)) {
          center = token;
          prefixflag = true;
        }
        else {
          reset(); continue;
        }
      }
      else if (!!left && !center && !right) {
        center = token;
      }
      else {
        reset(); continue;
      }
    }
    else {
      reset(); continue;
    }
    //simplify phase
    if ("simplify") {
      let shifter=false;
      if (!!left && !!center && !!right) {
        shifter=true;
        for (let l of left) {
          for (let r of right) {
          //PROCESS ~
            if (center === `~`) {
              if (!`'"`.includes(l.charAt(0)) && `'"`.includes(r.charAt(0))) {
                pancake.push([l,`~`,r]);
              }
              else if (`'"`.includes(l.charAt(0)) && !`'"`.includes(r.charAt(0))) {
                pancake.push([r,`~`,l]);
              }
            }
            //PROCESS <>
            else if (center === `<`) {
              pancake.push([r,`>`,l]);
            }
            else if (center === `>`) {
              pancake.push([l,`>`,r]);
            }
            //PROCESS EVERYTHING ELSE
            else if (`<>=~-`.includes(center)) {
              pancake.push([l,center,r]);
            }
            else {
              ;
            }
          }
        }
      }
      else if ((!left && !!center && !!right) ||
       (!!left && !!center && !right && tape.split(`,`)[0].trim()===``))
      {
        shifter=true;
        if (prepostfix.includes(center)) {
          let process = prefixflag ? right : left;
          //PROCESS =
          if (center === '=') {
            let main = prefixflag ? process[0] : process[process.length - 1];
            for (let thing of process) {
              pancake.push([main,center,thing]);
            }
          }
          //PROCESS -
          if (center === '-') {
            for (let i = 0; i < process.length; i++) {
              for (let j = i; j < process.length; j++) {
                pancake.push([process[i],center,process[j]]);
              }
            }
          }
        }
      }
      // SHIFTING PHASE
      // shift right to left, with all else clear
      if (shifter) {
        let temp = right;
        reset();
        left = temp;
        shifter=false;
      }
    }
  }
  //console.log('pancake:', pancake); // Added console.log
  return pancake;
}
function tapeEater(tape) {
  // match tags, single char operator
  const tagOperatorRegex = /^\s*([a-zA-Z0-9]+|\[.+\]|\S)/;
  const tagRegex = /^[a-zA-Z0-9]+|\[.+\]$/;
  let token;
  let restOfTape = tape.trim();
  // Define enclosure pairs
  const enclosures = [['[', ']'], ['"', '"'], ["'", "'"]];
  // Enclosure capture mode
  for (let [open, close] of enclosures) {
    if (restOfTape.startsWith(open)) {
      let endIndex = restOfTape.indexOf(close, 1);
      //debuglog(restOfTape);
      //debuglog(endIndex);
      if (endIndex === -1) {
        // If no closing enclosure is found, return error and clear tape
        token = [];
        restOfTape = '';
      } else {
        // If a closing enclosure is found, grab the enclosure, cut at end
        token = restOfTape.slice(0, endIndex + 1);
        restOfTape = restOfTape.slice(endIndex + 1);
      }
      token=[token];
      return [token, restOfTape];  // Return early if an enclosure was found
    }
  }
  // Parentheses capture mode
  if (restOfTape.startsWith('(')) {
    let groupTokens = [];
    restOfTape = restOfTape.slice(1); // Remove the opening parenthesis
    while (!restOfTape.startsWith(')') && !restOfTape.startsWith(',') && restOfTape.length > 0) {
      let newToken;
      [newToken, restOfTape] = tapeEater(restOfTape);
      groupTokens.push(newToken);
    }
    if (restOfTape.length === 0) {
      return [[], ''];
    }
    token = groupTokens.filter(
      token => Array.isArray(token) &&
      token.length === 1 &&
      typeof token[0] === 'string' &&
      token[0].length > 0 &&
      tagRegex.test(token[0])
    );
    restOfTape = restOfTape.slice(1); // Remove the closing parenthesis or comma
  }
  // Normal mode
  else {
    const match = restOfTape.match(tagOperatorRegex);
    if (match) {
      token = match[1];
      restOfTape = restOfTape.slice(match[0].length);
      if (tagRegex.test(token)) {
        token = [token];
      }
    } else {
      return ['', restOfTape];
    }
  }
  return [token, restOfTape];
}
function chatReply(context, prompt, model) {
 return new Promise((resolve, reject) => {
   //debuglog("Prompt:", prompt);
   debuglog("Model:", model);
   debuglog("Thinking...");
   fetch("https://openrouter.ai/api/v1/chat/completions", {
     method: "POST",
     headers: {
       "Authorization": `Bearer ${chatKey.value}`,
       "HTTP-Referer": "emnolope.github.io",
       "X-Title": "Slab2D",
       "Content-Type": "application/json"
     },
     body: JSON.stringify({
       "model": model,
       "messages": [
         {
           "role": "system",
           "content": context
         },
         {
           "role": "user",
           "content": prompt
         }
       ]
     })
   })
   .then(response => {
     debuglog("Response Status: ", response.status);
     if (!response.ok) {
       throw new Error(`HTTP error! status: ${response.status}`);
     }
     return response.json();
   })
   .then(data => {
     debuglog("Hey human!");
     //debuglog("Data:", JSON.stringify(data, null, 2));
     if (!data.choices || !data.choices[0] || !data.choices[0].message) {
       throw new Error("Unexpected API response");
     }
     let reply = data.choices[0].message.content;
     resolve(reply);
   })
   .catch(error => {
     debuglog("Hey human!");
     debuglog("Fetch Error: ", error);
     reject("Error!");
   });
 });
}
function replaceFragmentsTag(search, replace = '') {
  console.log(`Replacing tag: ${search} with ${replace}`);
  const fragmentResults = document.getElementById('fragment-results');
  const textareas = fragmentResults.getElementsByTagName('textarea');
  Array.from(textareas).filter(textarea => window.getComputedStyle(textarea).display !== 'none').forEach(textarea => {
    const metadata = extractMetadata(textarea.value);
    if (search) {
      metadata.tags = metadata.tags
        .map(tag => (tag === search ? replace : tag))
        .filter(Boolean);
    }
    textarea.value = `|${metadata.date || ''}|${metadata.tags.join(' ')||''}|${metadata.content}`;
  });
}
const debugDiv =        document.getElementById('debug');
function debuglog(...messages) {
  let append = messages.map(message => typeof message === 'string' ? message : JSON.stringify(message)).join(' ');
  debugDiv.textContent += append + '\r\n';
  return append;
}
const debuglogdelay = (function() {
  let counter = 50;
    return function(...args) {
      counter <= 0 ? debuglog(...args):counter--;
  }
})();
debuglog('program start');
//let cloud=new ProtectedTextApi(" "," ");
let cloud = [];
function loadParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  [loadName.value, loadPass.value] = [urlParams.get('o'), urlParams.get('t')];
  if (loadName.value && loadPass.value) {
    load(loadName.value, loadPass.value);
  }
  chatKey.value = urlParams.get('a');
} loadParameters();
