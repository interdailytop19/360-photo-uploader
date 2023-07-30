import Pica from 'pica';

const pica = Pica();

const toLargeFileName = fileName => `${fileName.substr(0, 2)}-large${fileName.substr(2)}`;

const resizeMain = (imgFile, isNormal, name, quality) => (
  new Promise((resolve, reject) => {
    const fileName = isNormal ? name : toLargeFileName(name);
    const width = isNormal ? 524 : 1048;
    const height = isNormal ? 524 : 1048;
    const { [isNormal ? 'normal' : 'large']: q } = quality;

    const reader = new FileReader();

    reader.onload = () => {
      const dataURL = reader.result;

      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        pica.resize(img, canvas)
          .then(result => pica.toBlob(result, 'image/jpeg', q))
          .then(blob => resolve(new File([blob], fileName, { type: 'image/jpeg' })))
          .catch(err => reject(err));
      };
      img.src = dataURL;
    };
    reader.readAsDataURL(imgFile);
  })
);

const resizeImg = (imgFile, quality) => (
  new Promise((resolve, reject) => {
    Promise.all([
      resizeMain(imgFile, true, imgFile.name, quality),
      resizeMain(imgFile, false, imgFile.name, quality),
    ])
      .then(data => resolve(data))
      .catch(err => reject(err));
  })
);

export default resizeImg;
