const {S3Client , PutObjectCommand } = require('@aws-sdk/client-s3');
const allowedContentTypes = require("./content-types");

const s3Client = new S3Client({
  region: 'ap-south-1',
  // region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: 'AKIAUTYZGP6J2Y4KZ27H',
    // accessKeyId: process.env.AWS_IAM_ACCESS_KEY,
    secretAccessKey: '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'
    // secretAccessKey: process.env.AWS_IAM_ACCESS_SECRET
  }
});

const getBlobName = (originalName) => {
  const identifier = Math.random().toString().replace(/0\./, '');
  return `${identifier}-${originalName}`;
};
const setBlobName = (fName, extn) => {
  const identifier = Math.random().toString().replace(/0\./, '');
  return `${fName}/${fName}-${identifier}.${extn}`;
};

const fileName = (fName , extn) => {
  return `${fName}-${Date.now().toString()}.${extn}`;
}

const invoiceFileName = (fName , invoice_no , extn) => {
  return `${fName}-${invoice_no}.${extn}`;
}

const bucket = 'diamzoo';
// const bucket = process.env.AWS_BUCKET_NAME;

async function saveToS3(buffer, parentfolder, contentType, sendorreceive) {
  let promise = new Promise(function (resolve, reject) {
    let newContentType = contentType.split(";");
    let blobName = "";
    allowedContentTypes.allowedContentTypes.some((element, index) => {
      if (element.mimeType == newContentType[0]) {
        blobName = parentfolder + '/' + sendorreceive + '/' + setBlobName(element.fName, element.extn);
      }
    });
    if (blobName != "") {
      var putParams = {
        Bucket: bucket,
        Key: blobName,
        Body: buffer,
        ContentType: contentType
      };
      const command = new PutObjectCommand(putParams);
      s3Client.send(command).then((data) => {
        if (data && data.$metadata && data.$metadata.httpStatusCode && data.$metadata.httpStatusCode == 200) {
          let data = { Key: blobName };
          resolve({ msg: 'file uploaded successfully', data });
        } else {
          reject(new Error({ msg: 'An error occurred while completing the upload' }));
        }
      }).catch((error) => {
        reject(new Error({ msg: 'An error occurred while completing the upload' }));
      });
    } else { reject(new Error({ msg: 'Invalid file name to upload file on cloud' })); }
  });
  return promise;
};

async function saveToS3WithName(buffer , parentfolder , contentType , sendorreceive) {
  console.log("datass");
  
  let promise = new Promise(function (resolve , reject) {
    let newContentType = contentType.split(";");
    let blobName = "";
    allowedContentTypes.allowedContentTypes.some((element, index) => {
      if(element.mimeType == newContentType[0]){
        blobName = parentfolder + '/' + sendorreceive + '/' + fileName(element.fName, element.extn);
      }
    });
    if (blobName != "") {
      var putParams = {
        Bucket: bucket,
        Key: blobName,
        Body: buffer,
        ContentType: contentType
      };
      const command = new PutObjectCommand(putParams);
      s3Client.send(command).then((data) => {
        if (data && data.$metadata && data.$metadata.httpStatusCode && data.$metadata.httpStatusCode == 200) {
          let data = { Key: blobName };
          console.log(data,"data");
          
          resolve({ msg: 'file uploaded successfully', data });
        } else {
          reject(new Error({ msg: 'An error occurred while completing the upload' }));
        }
      }).catch((error) => {
        reject(new Error({ msg: 'An error occurred while completing the upload' }));
      });
    } else { reject(new Error({ msg: 'Invalid file name to upload file on cloud' })); }
  });
  return promise;
};

async function saveToS3WithInvoiceNo(buffer , parentfolder , contentType , invoice_no) {
  let promise = new Promise(function (resolve , reject) {
    let newContentType = contentType.split(";");
    let blobName = "";
    allowedContentTypes.allowedContentTypes.some((element, index) => {
      if(element.mimeType == newContentType[0]){
        blobName = parentfolder + '/' + invoiceFileName(element.fName, invoice_no , element.extn);
      }
    });
    if (blobName != "") {
      var putParams = {
        Bucket: bucket,
        Key: blobName,
        Body: buffer,
        ContentType: contentType
      };
      const command = new PutObjectCommand(putParams);
      s3Client.send(command).then((data) => {
        if (data && data.$metadata && data.$metadata.httpStatusCode && data.$metadata.httpStatusCode == 200) {
          let data = { Key: blobName };
          resolve({ msg: 'file uploaded successfully', data });
        } else {
          reject(new Error({ msg: 'An error occurred while completing the upload' }));
        }
      }).catch((error) => {
        reject(new Error({ msg: 'An error occurred while completing the upload' }));
      });
    } else { reject(new Error({ msg: 'Invalid file name to upload file on cloud' })); }
  });
  return promise;
};

module.exports = {saveToS3 , saveToS3WithName, saveToS3WithInvoiceNo};