import { mkdir, copyFile } from 'node:fs/promises';
for(const [source,target] of [
  ['jquery/dist/jquery.min.js','jquery/jquery.min.js'],
  ['datatables.net/js/dataTables.min.js','datatables/dataTables.min.js'],
  ['datatables.net-dt/css/dataTables.dataTables.min.css','datatables-css/dataTables.dataTables.min.css'],
  ['xlsx/dist/xlsx.full.min.js','xlsx/xlsx.full.min.js']
]) { await mkdir('public/vendor/'+target.slice(0,target.lastIndexOf('/')),{recursive:true}); await copyFile('node_modules/'+source,'public/vendor/'+target); }
