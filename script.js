const debugDiv = document.getElementById('debug');
function debuglog(message) {
  let append = (typeof message === 'string') ? (message) : JSON.stringify(message);
  debugDiv.textContent += append + '\r\n';
}
debuglog('program start');
const mainPad = document.getElementById('main-pad');
const searchQuery = document.getElementById('search-query');
const fragmentResults = document.getElementById('fragment-results');
const finalPad = document.getElementById('final-pad');
const graphQuery = document.getElementById('graph-query');
const tempPad = document.getElementById("temp-pad");
const graphResults = document.getElementById('graph-results');
const loadName = document.getElementById('load-name');
const loadPass = document.getElementById('load-pass');
const searchSingleton = document.getElementById('search-singleton');
const chatContext =document.getElementById('chat-context');
const chatPad = document.getElementById('chat-pad');//REFACTOR THIS TO CHATCONTENT CAUSE IT RHYMES
const chatKey = document.getElementById('chat-key');
mainPad.value = `
||user|Type in pet dog and cat in tag search






||pet dog cat|bowls
||pet dog|bark
||pet cat|meow
||pet|
there are people who keep pet tigers and pet bats and pet elephants
||star|someone who's famous
||cat star|Taiga, Catwoman
||dog star|Snoop Dogg
||cat star|Garfield
||cat|La Fea Rosa
she's my cousin's cat she used to be so small but now she's all grown up
||cat star|Black Panther
||dog star|Snoopy
`

class ProtectedTextApi {
  constructor(site_id, passwd) {
    this.siteHash = CryptoJS.SHA512("/" + site_id).toString();
    this.pass = passwd;
    this.passHash = CryptoJS.SHA512(passwd).toString();
    this.endpoint = "https://www.protectedtext.com".concat("/", site_id);
    this.siteObj = {};
    this.dbversion = 0;
  }
  async loadTabs() {
    //const url = `https://api.allorigins.win/raw?url=` + `${this.endpoint}?action=getJSON`;
    const url = 'https://corsproxy.io/?' + encodeURIComponent(`${this.endpoint}?action=getJSON&dummy=${Date.now()}`);
    const response = await fetch(url);
    this.siteObj = await response.json();
    this.dbversion = this.siteObj['currentDBVersion'];
    this.rawtext = CryptoJS.AES.decrypt(this.siteObj['eContent'], this.pass).toString(CryptoJS.enc.Utf8);
    // Remove SHA2-512 HASH added after user's content
    //ending=CryptoJS.SHA512("/uhhidk").toString();
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
  async save(textToSave) {    const encript = String(textToSave + this.siteHash);
    var textEncrypted = await CryptoJS.AES.encrypt(encript, this.pass).toString();
    const postdata = new URLSearchParams();
    postdata.append("initHashContent", this.getWritePermissionProof(this.rawtext));
    postdata.append("currentHashContent", this.getWritePermissionProof(textToSave));
    postdata.append("encryptedContent", textEncrypted);
    postdata.append("action", "save");
    const clientHeaders={
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36`
      },
      body: postdata
    };
    var ret = undefined;
    try {
      const proxy = 'https://corsproxy.io/?';
      const url = proxy + encodeURIComponent(this.endpoint);
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
let cloud=new ProtectedTextApi(" "," ");
// Function to extract metadata from a note
function extractMetadata(note) {
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
          replace(/[-_~\s]\d{2,5}$/, '').
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
  metadata.tags = metadata.tags.map(tag => tag.toLowerCase());
  metadata.tags = metadata.tags.map(s=>
                                    ((idx=>idx===-1?[s,'']:[s.slice(0,idx),s.slice(idx)])(s.indexOf('_',1)))[0])
  metadata.tags=metadata.tags.filter(Boolean);
  /*if (metadata.tags.length) {
    debuglog(metadata.tags);
  }*/
  return metadata;
}
// Function to search text in the notepad
function searchText(query) {
  let results=[];
  const lines = mainPad.value.split('\n');
  //debuglog(lines);
  // If search bar is empty, return
  if (query === '') return;
  // Initialize a variable to hold the current parent note
  //var currentParentNote = null;
  // Initialize a variable to hold the current note (parent or subnote)
  var currentNote = [];
  // Loop through each line
  var hidden = true;
  for (var i = 0; i < lines.length; i++) {
    var metadata = extractMetadata(lines[i]);
    // If the line contains the search text, add it to the search results
    if (true) {
      // If the note is a parent note (has a date or tags), update the current parent note
      if (metadata.date || metadata.tags.length > 0) {
        // If there's a current note left, add it to the search results
        if (currentNote.length > 0) {
          results.push([currentNote,hidden]);
          //addNoteToSearchResults(currentNote,hidden,lines);
        }
        //currentParentNote = metadata;
        hidden=!evaluateAst(parseQuery(query), lines[i], metadata)
        currentNote = [i];
      } else {
        // If the line is a subnote, add it to the current note
        currentNote.push(i);
      }
    }
  }
  // If there's a current note left, add it to the search results
  if (currentNote.length > 0) {
    results.push([currentNote,hidden]);
    //addNoteToSearchResults(currentNote,hidden,lines);
  }
  return [lines,results];
}
function searchNotesAndDisplay() {
  // Clear the search results
  fragmentResults.innerHTML = '';
  let [lines,results]=searchText(searchQuery.value);
  results.map(([currentNote,hidden])=>addNoteToSearchResults(currentNote,hidden,lines));
}
// Function to adjust the height of a textarea to fit its content
function adjustTextareaHeight(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
  //debuglog('adj');
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
function resetText(u,d,t,q) {
  if (u) mainPad.value='';
  if (d) fragmentResults.innerHTML = '';
  if (t) finalPad.value = '';
  if (q) cloud = new ProtectedTextApi(" "," "), loadName.value = loadPass.value = '';
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
// Function to parse a search query into an AST
function parseQuery(query) {
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
// Function to evaluate an AST against a note
function evaluateAst(ast, note, metadata) {
  // Check if all tags in the AST are included in the note's metadata tags
  return ast.normal.some(tag => metadata.tags.includes(tag)) && 
         !ast.neg.some(tag => metadata.tags.includes(tag)) &&
         ast.pos.every(tag => metadata.tags.includes(tag));
}
async function load(name, pass) {
  cloud=new ProtectedTextApi(name,pass);
  debuglog(name);
  await cloud.loadTabs();
  debuglog('loadedtext');
  mainPad.value=cloud.view();
  debuglog('changedtext');  
}
function loadParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  [loadName.value, loadPass.value] = [urlParams.get('o'), urlParams.get('t')];
  if (loadName.value && loadPass.value) {
    load(loadName.value, loadPass.value);
  }
  chatKey.value = urlParams.get('a');
} loadParameters();
function downloadContent() {
  const content = document.getElementById('main-pad').value;
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const loadNameValue = document.getElementById('load-name').value;
  const d = new Date();
  const timestamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  a.download = loadNameValue ? `${loadNameValue}_${timestamp}.txt` : 'download.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
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

//async function load_emnolope2() {
//  load("emnolope2","   ");
//}
//async function load_regret2() {
//  load("emnoloperegret2"," ");
//}
//async function load_uhhidk() {
//  load("uhhidk","password1234");
//}
function save() {
  debuglog("Trying to save...");
  if (finalPad.value == "") {
    debuglog("text area empty, refusing to save");
    return;
  }
  cloud.save(finalPad.value);
}
function recycle() {
  mainPad.value=finalPad.value;
  resetText(0,1,1,0);
}
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
function graphSearch(query) {
  let [lines,results]=searchText("tag");
  results=results.filter(([currentNote,hidden])=>!hidden);
  results=results.map(([currentNote,hidden])=>currentNote);
  results=results.map(linens=>linens.map(linen=>lines[linen]).join('\n')).join('\n');
  if (query!=="")
    results=searchGraph(query,results);
  graphResults.value=results;
}
function searchGraph(term, input) {
  let allEdges = simplifyGraphLang(input);
  let terms = term.split(" ");
  let matchingEdges2 = allEdges.map(edge=>edge.join('')).filter(edge => terms.some(t => edge.includes(t))).join(' ');
  let matchingEdges = allEdges.map(edge=>edge[0]+' '+edge[2]).filter(edge => terms.some(t => edge.includes(t)));
  return matchingEdges.join(' ')+'\n'+matchingEdges2;
}
async function extractTags(query="") {
  const querys = query.split(" ");
  debuglog(querys);
  const lines = mainPad.value.split('\n');
  const uniqueTags = new Set();
  for (const line of lines) {
    const metadata = extractMetadata(line);
    if (!query || querys.some(aquery => metadata.tags.includes(aquery))) {
      for (const tag of metadata.tags) {
        uniqueTags.add(tag);
      }
    }
  }
  graphResults.value=[...uniqueTags].join(' ');
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
function chatReply(context, prompt, useGPT4 = false) {
  debuglog('Prompt:');
  debuglog(prompt);
  if (!chatPad || !chatKey) {
    debuglog('Error: chatPad or chatKey is null');
    return;
  }
  debuglog("Thinking...")
  debuglog('Chat Key:')
  debuglog(chatKey.value);
  return new Promise((resolve, reject) => {
    let url = 'https://api.openai.com/v1/chat/completions';
    let model = useGPT4 ? 'gpt-4-1106-preview' : 'gpt-3.5-turbo-1106';
    let body = JSON.stringify({
      'model': model,
      'messages': [{
        'role': 'system',
        'content': context
      }, {
        'role': 'user',
        'content': prompt
      }],
      'max_tokens': 2048
    });
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chatKey.value}`
      },
      body: body
    })
    .then(response => {
      debuglog('Response Status:');
      debuglog(response.status);
      debuglog('Response OK:')
      debuglog(response.ok);
      return response.json();
    })
    .then(data => {
      debuglog('Data:');
      debuglog(JSON.stringify(data, null, 2));
      debuglog("Hey human!");
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        debuglog('Error: data.choices is undefined');
        reject('Error: Unexpected API response');
      } else {
        let reply = data.choices[0].message.content;
        resolve(reply);
      }
    })
    .catch(error => {
      debuglog('Fetch Error:');
      debuglog(error);
      reject('Error!');
    });
  });
}























































/*

There should be a large slab of text.
Then there should be viewports of that slab of text.
Those viewports should look like sections of that slab of text.
Internally, all they contain are references to indexes/positions/pointers to that slab of text.
And so every time the user edits the text, it changes the original, and then propagates that change to the section they're editing.
This means that only the original document is edited, even if there are sections of it on display.

The way of doing involving making bidirectional event listeners that keep the source object and slave object in sync, and it keeps track of what's what via the end points of line segments, which are applied to a rope data structure that represents a section of text, that way it keeps linearity with log(n) time.

uses lines.split
array accumulator already there
if statement sets variable which modulates add addnotediv
div always has data in it, but data can be hidden
div contains textarea with data, or nothing with data
combine function on bottom adds text together to readonly textarea.
DONE

giant slab of text.
segments consist of begin end points
is there intersection between selection and the segments
if there is an intersection, update the corresponding objects
any changes made through the objects should directly update the slab, and therefore write your own editor.

|20230610|book gpt slab prog fsd csi|The Craft of Text Editing / Emacs for the Modern World by Craig A. Finseth
Text editor data structures? >>> Gap buffer, rope, piece table.
Recommended data structure for cutting and stitching documents? >>> Piece table.
Implementation details? >>> Implement insert, delete, get_text, and stitch methods.
Edge cases to consider? >>> Inserting or deleting at document extremes, spanning multiple pieces, overlapping edits.
Performance optimization? >>> Use lazy loading, caching, indexing, efficient data structures, multi-threading, and incremental updates.
Recommended resources? >>> "Data Structures and Algorithms in Java" by Robert Lafore and "The Art of Computer Programming, Volume 1: Fundamental Algorithms" by Donald Knuth.
Simplest data structure for a beginner? >>> Array.


// Extracttags, old
"\n// Function to extract metadata from a note\nfunction extractMetadata(note) {\n  // Initialize metadata\n  var metadata = {\n    date: null,\n    tags: [],\n    content: note\n  };\n  // Regular expressions for the different formats\n  var format1 = /^\\|(\\d{8})?\\|([a-zA-Z0-9_ -]*)\\|(.*)$/;\n  var format2 = /^(\\d{8} )?([a-zA-Z0-9_ -]*)\\s{3}(.*)$/;\n  var format3 = /^\\|(\\d{8})?\\|([a-zA-Z0-9_ -]*[-_][a-zA-Z0-9_ -]*)\\|(.*)$/;\n  // Check if the note matches the '|DATE|TAG-FILE|CONTENT' or '|DATE|TAG_FILE|CONTENT' format\n  var match = note.match(format3);\n  if (match) {\n    metadata.date = match[1];\n    metadata.tags = match[2].split(/[-_]/)[0].split(' ');\n  }\n  // Check if the note matches the 'DATE TAG   CONTENT' format\n  else if (match = note.match(format2)) {\n    metadata.date = match[1];\n    metadata.tags = match[2].split(' ');\n  }\n  // Check if the note matches the '|DATE|TAG|CONTENT' format\n  else if (match = note.match(format1)) {\n    metadata.date = match[1];\n    metadata.tags = match[2].split(' ');\n  }\n  // Convert tags to lowercase\n  metadata.tags = metadata.tags.map(tag => tag.toLowerCase());\n  return metadata;\n}\n"


// Search Bar AND OR NOT
"function parseQuery(query) {\n  var tokens = query.match(/\\(|\\)|AND|OR|NOT|tag:[^\\s]+/g);\n  var stack = [];\n  for (var i = 0; i < tokens.length; i++) {\n    if (tokens[i] === 'AND' || tokens[i] === 'OR' || tokens[i] === 'NOT') {\n      stack.push({ operator: tokens[i], operands: [] });\n    } else if (tokens[i] === '(') {\n      stack.push({ operator: '(', operands: [] });\n    } else if (tokens[i] === ')') {\n      var operands = [];\n      while (stack.length > 0 && stack[stack.length - 1].operator !== '(') {\n        operands.unshift(stack.pop());\n      }\n      if (stack.length === 0) {\n        console.log('Error: Unmatched closing parenthesis');\n        return { operator: 'AND', operands: [] };  // Default value\n      }\n      stack.pop();  // Pop the '('\n      if (stack.length === 0) {\n        console.log('Error: No operator for operands');\n        return { operator: 'AND', operands: [] };  // Default value\n      }\n      stack[stack.length - 1].operands.push(operands);\n    } else {\n      if (stack.length === 0) {\n        console.log('Error: No operator for term');\n        return { operator: 'AND', operands: [] };  // Default value\n      }\n      stack[stack.length - 1].operands.push({ term: tokens[i] });\n    }\n  }\n  if (stack.length !== 1) {\n    console.log('Error: Unmatched opening parenthesis');\n    return { operator: 'AND', operands: [] };  // Default value\n  }\n  return stack[0];\n}\nfunction evaluateAst(ast, note) {\n  if (ast.operator === 'AND') {\n    return ast.operands.every(function(operand) { return evaluateAst(operand, note); });\n  } else if (ast.operator === 'OR') {\n    return ast.operands.some(function(operand) { return evaluateAst(operand, note); });\n  } else if (ast.operator === 'NOT') {\n    if (ast.operands.length === 0) {\n      console.log('Error: No operand for NOT operator');\n      return false;  // Default value\n    }\n    return !evaluateAst(ast.operands[0], note);\n  } else {  // term\n    var parts = ast.term.split(':');\n    var type = parts[0];\n    var value = parts[1];\n    if (type === 'tag') {\n      var tags = extractTags(note);\n      return tags.includes(value);\n    } else {\n      console.log('Error: Unsupported term type');\n      return false;  // Default value\n    }\n  }\n}"


// Undo/Redo object
"var undoRedo = (function() {\n  var undoStack = [];\n  var redoStack = [];\n  function applyOperation(stack1, stack2) {\n    if (stack1.length > 0) {\n      // Pop the last operation from stack1\n      var operation = stack1.pop();\n\n      // Prepare the inverse operation\n      var inverseOperation = {\n        position: operation.position,\n        text: operation.text\n      };\n      // Determine the inverse operation\n      switch (operation.operation) {\n        case 'insert':\n          inverseOperation.operation = 'delete';\n          break;\n        case 'delete':\n          inverseOperation.operation = 'insert';\n          break;\n        case 'replace':\n          inverseOperation.operation = 'replace';\n          break;\n      }\n      stack2.push(inverseOperation);\n      // Apply the operation to the lines\n      switch (operation.operation) {\n        case 'insert':\n          lines[operation.position] = lines[operation.position].substring(0, operation.position) + operation.text + lines[operation.position].substring(operation.position);\n          break;\n        case 'delete':\n          lines[operation.position] = lines[operation.position].substring(0, operation.position) + lines[operation.position].substring(operation.position + operation.text.length);\n          break;\n        case 'replace':\n          lines[operation.position] = lines[operation.position].substring(0, operation.position) + operation.text + lines[operation.position].substring(operation.position + operation.text.length);\n          break;\n      }\n      updateNotepad();\n    }\n  }\n  return {\n    record: function(operation) {\n      undoStack.push(operation);\n      redoStack = [];  // Clear the redo stack whenever a new change is made\n    },\n    undo: function() {\n      applyOperation(undoStack, redoStack);\n    },\n    redo: function() {\n      applyOperation(redoStack, undoStack);\n    }\n  };\n})();"


// Very simple protectedtext.com fetcher
"async function gettext(note, password) {\n  debuglog('gettextfun');\n  const url = `https://api.allorigins.win/raw?url=`+`https://www.protectedtext.com/${note}?action=getJSON`;\n  const response = await fetch(url, {\n    method: 'GET',\n    headers: { 'Content-Type': 'application/json' },\n  });\n  debuglog('fetched');\n  if (response.ok) {\n    const data = await response.json();\n    const e_orig_content = data[\"eContent\"];\n    const text = CryptoJS.AES.decrypt(e_orig_content, password).toString(CryptoJS.enc.Utf8);\n    debuglog('good')\n    return text;\n  } else {\n    debuglog(`Error fetching data: ${response.status} - ${response.statusText}`);\n    return 'ERROR';\n  }\n}"


// Lines class
"class Lines {\n  constructor(initialLines = []) {\n    this.lines = [];\n    this.globalCallbacks = []; // Add a globalCallbacks property\n    // Initialize the lines with the initial lines\n    for (let i = 0; i < initialLines.length; i++) {\n      this.set(i, initialLines[i]);\n    }\n  }\n  ensureLineExists(index) {\n    // If the line doesn't exist yet, create it\n    if (!this.lines[index]) {\n      this.lines[index] = {\n        text: '',\n        callbacks: []\n      };\n    }\n  }\n  get(index, callback) {\n    this.ensureLineExists(index);\n    // If a callback is provided, add it to the list of callbacks for this line\n    if (callback) {\n      this.lines[index].callbacks.push(callback);\n    }\n    return this.lines[index].text;\n  }\n  set(index, value) {\n    this.ensureLineExists(index);\n    // Set the line's text\n    this.lines[index].text = value;\n    // If there are any callbacks for this line, call them\n    this.lines[index].callbacks.forEach(callback => callback(value));\n    // Call the global callbacks\n    this.globalCallbacks.forEach(callback => callback(index, value));\n  }\n  addGlobalCallback(callback) {\n    // Add a callback to the globalCallbacks array\n    this.globalCallbacks.push(callback);\n  }\n  removeCallbacks(index) {\n    this.ensureLineExists(index);\n    // Remove all callbacks for this line\n    this.lines[index].callbacks = [];\n  }\n}\n"
*/
