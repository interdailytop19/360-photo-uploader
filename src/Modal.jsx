import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import './Modal.css';

class UploadedModal extends PureComponent {
  onOverlayClick = () => {
    const { closeModal } = this.props;
    closeModal();
  };

  onDialogClick = e => e.stopPropagation();

  handleKeyPress = (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      this.onOverlayClick();
    }
  };

  render() {
    const { isModalOpen, modalTitle, children } = this.props;
    if (!isModalOpen) {
      return null;
    }

    return (
      <React.Fragment>
        <div className="photo-upload-app-modal-overlay-div" />
        <div
          className="photo-upload-app-modal-content-div"
          onClick={this.onOverlayClick}
          onKeyPress={this.handleKeyPress}
          role="presentation"
        >
          <div
            className="photo-upload-app-modal-dialog-div"
            onClick={this.onDialogClick}
            role="presentation"
          >
            <div className="photo-upload-app-modal-header">
              <h3>{modalTitle}</h3>
            </div>
            <div className="photo-upload-app-modal-body">
              {children}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

UploadedModal.propTypes = {
  isModalOpen: PropTypes.bool.isRequired,
  closeModal: PropTypes.func.isRequired,
  modalTitle: PropTypes.string.isRequired,

  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.element),
    PropTypes.element,
  ]),
};

UploadedModal.defaultProps = {
  children: null,
};

export default UploadedModal;
