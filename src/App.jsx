import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-virtualized-select';
import createFilterOptions from 'react-select-fast-filter-options';
import Fuse from 'fuse.js';

import Modal from './Modal';

import resizeImg from './service/resizeService';

import './App.css';
import './magic360/magic360.css';
import 'react-virtualized-select/styles.css';
import 'react-select/dist/react-select.css';

const urls = new WeakMap();

const fileUrl = (file) => {
  if (urls.has(file)) {
    return urls.get(file);
  }
  const url = URL.createObjectURL(file);
  urls.set(file, url);
  return url;
};

const clearUrls = (imgFiles) => {
  imgFiles.forEach((imgFile) => {
    if (urls.has(imgFile)) {
      URL.revokeObjectURL(urls.get(imgFile));
      urls.delete(imgFile);
    }
  });
};

let imgUrls = [];

class App extends Component {
  constructor(props) {
    super(props);

    const { is2ndHand, skus, quality } = props;
    let { selectedSku } = props;

    if (!is2ndHand && !!selectedSku && !selectedSku.imgUrl) {
      const searchedSku = skus.find(element => element.sku === selectedSku.sku);
      if (searchedSku !== undefined) {
        selectedSku = searchedSku;
      }
    }

    this.state = {
      imgFiles: [],
      selectedSku,
      previewImg: null,

      progress: 0,
      action: 'resize',
      imgNames: [],

      modalType: 0, // 0: close, 1: uploaded imgs, 2: server 360 preview, 3: local 360 preview
      serv360IsAvailable: false,
    };

    this.loading = React.createRef();

    this.filterOptions = createFilterOptions({ options: skus, labelKey: 'sku', valueKey: 'sku' });

    // fuse
    let maxPatternLength = 0;
    skus.forEach((element) => {
      if (element.sku.length > maxPatternLength) {
        maxPatternLength = element.sku.length;
      }
    });
    const fuseOptions = {
      shouldSort: true,
      threshold: 0.5,
      location: 0,
      distance: 100,
      maxPatternLength,
      minMatchCharLength: 2,
      keys: ['sku'],
    };
    this.fuse = new Fuse(skus, fuseOptions);

    this.resizeImg = imgFile => resizeImg(imgFile, quality);
  }

  async componentDidMount() {
    const { selectedSku } = this.state;
    if (selectedSku) {
      this.setState({ serv360IsAvailable: await this.checkServ360IsAvailable(selectedSku.sku) });
    }
  }

  componentDidUpdate() {
    // magic 360 preview
    const { modalType } = this.state;
    if (modalType === 2 || modalType === 3) {
      const Magic360Options = {
        row: '1',
        columns: '12',
        'autospin-speed': '2000',
        'mousewheel-step': '1',
        autospin: 'infinite',
      };
      if (modalType === 2) {
        Magic360Options.filename = '{col}.jpg';
        Magic360Options['large-filename'] = '{col}-large.jpg';
      } else {
        Magic360Options.images = imgUrls.join(' ');
      }
      window.Magic360Options = Magic360Options;
      window.Magic360.start();
    }
  }

  closeModal = () => this.setState(({ modalType: 0 }));

  openUploadedModal = () => this.setState(({ modalType: 1 }));

  openServer360Modal = () => this.setState(({ modalType: 2 }));

  openLocal360Modal = () => this.setState(({ modalType: 3 }));

  modalTitle = () => {
    const { modalType } = this.state;
    return modalType === 1 ? 'Uploaded photo' :
      modalType === 2 ? 'Server 360 preview' :
        modalType === 3 ? 'Local 360 preview' :
          '';
  }

  modalBody = () => {
    const { modalType, imgNames, selectedSku } = this.state;
    const { imgServer } = this.props;

    const skuString = selectedSku ? selectedSku.sku.replace(/\s/g, '%20') : '';
    switch (modalType) {
      case 1:
        return (
          imgNames.map(imgName => (
            <div className="photo-upload-app-image-card" key={imgName}>
              <a
                href={`${imgServer}/${skuString}/${imgName}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={`${imgServer}/${skuString}/${imgName}`} alt={imgName} />
                <span>{imgName}</span>
              </a>
            </div>
          ))
        );
      case 2:
        return (
          <div className="photo-upload-app-magic360-preview col">
            <a className="Magic360" href={`${imgServer}/${skuString}/01-large.jpg`}>
              <img src={`${imgServer}/${skuString}/01.jpg`} alt="preview" />
            </a>
          </div>
        );
      case 3:
        return (
          <div className="photo-upload-app-magic360-preview col">
            <span className="Magic360">
              <img src={imgUrls[0]} alt="preview" />
            </span>
          </div>
        );
      default:
        return null;
    }
  }

  showLoading = () => { this.loading.current.className = 'photo-upload-app-uploading'; };

  hideLoading = () => { this.loading.current.className = 'photo-upload-app-uploaded'; };

  onDragOver = e => e.preventDefault();

  isVaildImg = entry => entry.isFile && /^(0[1-9]|1[0-2]).(jpg|jpeg|png)$/.test(entry.name);

  entryToFile = entry => new Promise((resolve, reject) => entry.file(resolve, reject));

  checkServ360IsAvailable = async (sku) => {
    if (!window.Magic360) {
      return false;
    }
    try {
      const { imgServer } = this.props;
      const res = await fetch(`${imgServer}/${sku}/01.jpg`);
      return res && res.ok;
    } catch (err) {
      console.log(err);
    }
    return false;
  }

  onDrop = (e) => {
    e.preventDefault();

    const { items } = e.dataTransfer;
    if (items.length !== 1) {
      alert('Something wrong with the dropped file/directory');
      return;
    }

    const item = items[0].webkitGetAsEntry();
    if (!item) {
      alert('Please use Chrome for function supported');
      return;
    }

    // TODO: update one img file only
    if (item.isDirectory) {
      // Get folder contents
      item.createReader()
        .readEntries((entries) => {
          const imgEntries = entries.filter(this.isVaildImg);
          if (imgEntries.length !== 12) {
            alert('Directory not containing exactly 12 vaild img files');
            return;
          }

          // clear previous urls
          const { imgFiles: stateImgFiles } = this.state;
          if (stateImgFiles.length === 12) {
            clearUrls(stateImgFiles);
          }

          Promise
            .all(imgEntries.map(this.entryToFile))
            .then(async (imgFiles) => {
              const sortedImgFiles = imgFiles.sort((fileA, fileB) => {
                const intA = parseInt(fileA.name, 10);
                const intB = parseInt(fileB.name, 10);

                return (intA < intB) ? -1 : (intA > intB) ? 1 : 0;
              });

              imgUrls = sortedImgFiles.map(fileUrl);

              const newState = {
                imgFiles: sortedImgFiles,
                previewImg: sortedImgFiles[0],
              };

              const { is2ndHand, skus, selectedSku: propsSelectedSku } = this.props;

              if (!is2ndHand && !propsSelectedSku) {
                const dirName = item.name.trim().replace(/:/g, '/');
                const selectedSku = skus.find(sku => sku.sku === dirName);
                if (selectedSku !== undefined) {
                  newState.selectedSku = selectedSku;

                  const { selectedSku: stateSelectedSku } = this.state;
                  if (stateSelectedSku && dirName !== stateSelectedSku.sku) {
                    // warn if sku is selected and directory name does not match
                    alert('Folder name (sku) is different from selected sku');
                  }
                } else {
                  const fuseResult = this.fuse.search(dirName);
                  if (fuseResult.length > 0) {
                    const [closestResult] = fuseResult;
                    newState.selectedSku = closestResult;

                    alert('No exact sku found. Closest sku matched.');
                  } else {
                    alert('Folder name (sku) not found on server list');
                  }
                }
              }

              // after user drop a folder, fetch the folder name (sku)'s 01.jpg
              // for server 360 view
              if (newState.selectedSku) {
                newState.serv360IsAvailable =
                  await this.checkServ360IsAvailable(newState.selectedSku.sku);
              }

              this.setState(newState);
            });
        });
    }
  };

  onSkuChange = async (selectedSku) => {
    let serv360IsAvailable = false;
    if (selectedSku !== null) {
      serv360IsAvailable = await this.checkServ360IsAvailable(selectedSku.sku);
    }
    this.setState({ selectedSku, serv360IsAvailable });
  };

  renderPreview = imgFile => this.setState({ previewImg: imgFile });

  setProgress = (arr, mapper) => (
    arr.reduce((chain, cur) => chain.then(chainResults => mapper(cur).then((res) => {
      this.setState(prevState => ({ progress: prevState.progress + 1 }));
      return chainResults.concat(res);
    })), Promise.resolve([]))
  )

  uploadImg = (file, url) => {
    const formData = new FormData();
    formData.append(file.name, file, file.name);
    return fetch(url, {
      method: 'POST',
      body: formData,
    });
  }

  handleSubmit = async () => {
    this.showLoading();

    const { selectedSku, imgFiles } = this.state;
    const {
      imgServer, is2ndHand, serial, mqUrl,
    } = this.props;

    if (is2ndHand) {
      if (!window.confirm(`Are you sure to upload images of serial : '${serial}'?`)) {
        this.hideLoading();
        return;
      }
    } else if (!selectedSku) {
      alert('Please select a vaild sku');
      this.hideLoading();
      return;
    } else if (!window.confirm(`Are you sure to upload images of sku : '${selectedSku.sku}'?`)) {
      this.hideLoading();
      return;
    }

    let resizedImgs;
    try {
      this.setState({ action: 'resize', progress: 0 });
      resizedImgs = await this.setProgress(imgFiles, this.resizeImg);
    } catch (e) {
      console.log(e);
      alert('Resize image error');
      this.hideLoading();
      return;
    }

    try {
      // space in sku should be encoded just before upload
      const folder = selectedSku.sku.replace(/\s/g, '%20');
      const url = `${imgServer}/${folder}/`;
      const uploadImg = img => this.uploadImg(img, url);

      this.setState({ action: 'upload', progress: 0 });

      const responses = await this.setProgress(resizedImgs, uploadImg);

      const imgNames = (await Promise.all(
        responses
          .filter(res => res.ok)
          .map(async res => (await res.json()).name),
      )).sort();

      this.setState({ modalType: 1, imgNames });

      if (responses.some(res => !res.ok)) {
        alert('Some image upload failed, please check');
      } else {
        alert('Upload succeeded');
      }

      try {
        if (mqUrl === '') {
          console.log('No mqUrl provided');
        } else {
          // notify to mq server
          const mqRes = await fetch(mqUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ folder: selectedSku.sku, imgNames }),
          });
          console.log(mqRes);
        }
      } catch (e) {
        console.error('cannot notify mq, error : ', e);
      }
    } catch (e) {
      console.log(e);
      alert(`Upload failed: ${e}`);
    }
    this.hideLoading();
  };

  render() {
    const {
      imgFiles, selectedSku, previewImg,
      progress, action, imgNames,
      modalType, serv360IsAvailable,
    } = this.state;

    const {
      is2ndHand, serial, skus, selectedSku: propsSelectedSku,
    } = this.props;

    return (
      <div className="photo-upload-app">
        <div className="photo-upload-app-wrapper">

          <Modal
            isModalOpen={modalType !== 0}
            closeModal={this.closeModal}
            modalTitle={this.modalTitle()}
          >
            {this.modalBody()}
          </Modal>

          <section className="photo-upload-app-box-row">
            <div className="photo-upload-app-left-side-area">

              {
                !is2ndHand ? (
                  <Select
                    className="photo-upload-app-sku-select"
                    value={selectedSku}
                    valueKey="sku"
                    labelKey="sku"
                    onChange={this.onSkuChange}
                    options={skus}
                    filterOptions={this.filterOptions}
                    placeholder="Sku"
                    clearable
                    disabled={!!propsSelectedSku}
                  />
                ) :
                  <div>{`2nd hand stock, serial : ${serial}`}</div>
              }

              <div>{previewImg && previewImg.name}</div>

              <div className="photo-upload-app-preview-area">
                <div className="photo-upload-app-server-preview">
                  {
                    (selectedSku && selectedSku.imgUrl) ?
                      <img src={`${selectedSku.imgUrl}`} alt="imgServer-imgUrl" /> :
                      <p>No preview image</p>
                  }
                </div>
                <div className="photo-upload-app-upload-preview">
                  {
                    previewImg && <img src={fileUrl(previewImg)} alt="preview" />
                  }
                </div>
              </div>
            </div>

            <div
              className="photo-upload-app-drop-area"
              onDragOver={this.onDragOver}
              onDrop={this.onDrop}
            >
              {
                imgFiles.length === 0 ?
                  <p>drop here</p> :
                  (
                    <React.Fragment>
                      {imgFiles.map(imgFile => (
                        <button
                          className="photo-upload-app-file-button"
                          key={imgFile.name}
                          type="button"
                          onClick={() => this.renderPreview(imgFile)}
                        >
                          {imgFile.name}
                        </button>
                      ))}
                      {!!window.Magic360 && (
                        <div>
                          <button
                            className="photo-upload-app-file-button"
                            type="button"
                            onClick={this.openLocal360Modal}
                          >
                            Local 360 view
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  )
              }
            </div>
          </section>
          <button className="photo-upload-app-submit-button" type="button" onClick={this.handleSubmit}>
            submit
          </button>

          {!!window.Magic360 && serv360IsAvailable && (
            <button className="photo-upload-app-preview-button" type="button" onClick={this.openServer360Modal}>
              Server 360 view
            </button>
          )}

          {imgNames.length > 0 && (
            <button
              className="photo-upload-app-upload-model-button"
              type="button"
              onClick={this.openUploadedModal}
            >
              Uploaded iamges
            </button>
          )}
        </div>
        <div
          ref={this.loading}
          className="photo-upload-app-uploaded"
        >
          <div className="photo-upload-app-spin" />
          {action === 'resize' && <span>{`resizing ${progress}/12...`}</span>}
          {action === 'upload' && <span>{`uploading ${progress}/24...`}</span>}
        </div>
      </div>
    );
  }
}

const neededIfIs2ndHand = (props, propName) => {
  const { is2ndHand, [propName]: prop } = props;
  if (is2ndHand && (!prop || typeof prop !== 'string')) {
    return new Error(`Please provide props '${propName}'!`);
  }
  return null;
};

App.propTypes = {
  imgServer: PropTypes.string.isRequired,
  quality: PropTypes.shape({
    normal: PropTypes.number.isRequired,
    large: PropTypes.number.isRequired,
  }).isRequired,

  mqUrl: PropTypes.string,

  is2ndHand: PropTypes.bool.isRequired,
  selectedSku: PropTypes.shape({
    sku: PropTypes.string.isRequired,
    imgUrl: PropTypes.string,
  }),
  serial: neededIfIs2ndHand,

  skus: PropTypes.arrayOf(PropTypes.shape({
    sku: PropTypes.string.isRequired,
    imgUrl: PropTypes.string,
  })),
};

App.defaultProps = {
  mqUrl: '',
  selectedSku: null,
  serial: '',
  skus: [],
};

export default App;
