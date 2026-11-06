// node run-selftest.js   (from the repo root)
const fs=require('fs'),vm=require('vm');global.window=global;
['planner/core/registry.js','planner/modules/tasks.js','planner/modules/note.js','planner/modules/links.js','planner/modules/list.js','planner/modules/time.js','planner/modules/milestone.js','planner/core/model.js','planner/core/migrate.js','planner/core/store.js','planner/core/history.js','planner/templates.js','planner/selftest.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f}));
let p=0,f=0;PlannerSelfTest((n,ok,d)=>{ok?p++:f++;if(!ok)console.log('FAIL',n,'\n',d)});
console.log(p+' passed, '+f+' failed');process.exit(f?1:0);
