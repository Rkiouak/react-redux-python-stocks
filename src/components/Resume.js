import React from "react";
import NavigationBar from './NavigationBar';
import PDF from 'react-pdf';

const Resume = React.createClass({
  render(){
    <div>
      <h1>Hi</h1>
      <PDF file = "/resume.pdf"/>
   </div>
  }
})

export default Resume
