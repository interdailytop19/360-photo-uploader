import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const renderImgUpload = (props, elementId) => {
  ReactDOM.render(
    <App {...props} />, document.getElementById(elementId),
  );
};

export default { renderImgUpload };
