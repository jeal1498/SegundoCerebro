import React from 'react';
import { T } from '../theme/tokens.js';

// ===================== ERROR BOUNDARY =====================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{background:'#0d1117',color:'#f85149',padding:24,fontFamily:'monospace',fontSize:13,minHeight:'100vh',overflowY:'auto'}}>
          <div style={{color:'#3fb950',fontSize:18,marginBottom:16}}>🧠 Error detectado</div>
          <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',color:'#f85149'}}>{String(this.state.error)}</pre>
          <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',color:'#7d8590',fontSize:11,marginTop:12}}>{this.state.error?.stack}</pre>
          <button onClick={()=>this.setState({error:null})} style={{marginTop:16,background:'#3fb950',color:'#000',border:'none',borderRadius:8,padding:'8px 16px',cursor:'pointer',fontWeight:600}}>Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}


export default ErrorBoundary;
