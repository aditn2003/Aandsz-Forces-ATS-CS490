export function Field({label,type="text",...props}){
  return(
  <div className="field">
    <label>{label}</label>
    <input type={type} {...props}/>
  </div>);
}
export function TextArea({label,...props}){
  return(
  <div className="field">
    <label>{label}</label>
    <textarea {...props}></textarea>
  </div>);
}

