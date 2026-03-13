import Icon from '../components/icons/Icon.jsx';

const NAV_SECTIONS=[
  {label:'VIDA',items:[
    {id:'dashboard',    label:'Inicio',         icon:'home'},
    {id:'areas',        label:'Áreas',           icon:'grid'},
    {id:'objectives',   label:'Objetivos',       icon:'target'},
    {id:'relaciones',   label:'Relaciones',      icon:'people'},
    {id:'health',       label:'Salud',           icon:'health'},
    {id:'finance',      label:'Finanzas',        icon:'money'},
    {id:'coche',        label:'Vehículos',       icon:'car'},
  ]},
  {label:'TRABAJO',items:[
    {id:'projects',     label:'Proyectos',       icon:'folder'},
    {id:'notes',        label:'Notas',           icon:'note'},
    {id:'sideprojects', label:'Side Projects',   icon:'rocket'},
    {id:'education',    label:'Educación',       icon:'graduation'},
    {id:'desarrollo',   label:'Desarrollo',      icon:'brain'},
  ]},
  {label:'CAPTURA',items:[
    {id:'inbox',        label:'Inbox',           icon:'inbox'},
    {id:'habits',       label:'Hábitos',         icon:'habit'},
    {id:'journal',      label:'Journal',         icon:'journal'},
    {id:'shopping',     label:'Compras',         icon:'cart'},
    {id:'books',        label:'Libros',          icon:'book'},
    {id:'hogar',        label:'Hogar',           icon:'home'},
  ]},
  {label:'ESTILO DE VIDA',items:[
    {id:'entretenimiento', label:'Entretenimiento', icon:'film'},
    {id:'mascotas',        label:'Mascotas',        icon:'paw'},
    {id:'viajes',          label:'Viajes',          icon:'plane'},
    {id:'nutricion',       label:'Nutrición',       icon:'fork'},
    {id:'sueno',           label:'Sueño',           icon:'moon'},
  ]},
  {label:'SISTEMA',items:[
    {id:'settings',     label:'Config',          icon:'cog'},
  ]},
];
const NAV=NAV_SECTIONS.flatMap(s=>s.items);
const MOBILE_NAV=[
  {id:'dashboard',    label:'Inicio',  icon:'home'},
  {id:'inbox',        label:'Inbox',   icon:'inbox'},
  {id:'psicke',       label:'Psicke',  icon:'brain'},
  {id:'finance',      label:'Finanzas',icon:'money'},
  {id:'areas',        label:'Áreas',   icon:'grid'},
];
const MORE_NAV=NAV.slice(5);

export { NAV_SECTIONS, NAV, MOBILE_NAV, MORE_NAV };
