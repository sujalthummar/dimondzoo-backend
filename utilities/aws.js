var fs = require("fs");
var AWS = require("aws-sdk");

// AWS.config.update({
//     accessKeyId: process.env.AWS_ACCESS_KEY,
//     secretAccessKey: process.env.AWS_SECRET_KEY,
//   });

var s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  ACL : "public-read"
});
const allowedContentTypes = require("./contentTypes");
const bucket = process.env.AWS_BUCKET_NAME;
let async = require("async");
const { error, log } = require("console");
var multipartMap = {
  Parts: [],
};

var partSize = 1024 * 1024 * 5;

const acl = "public-read";
const getBlobName = (originalName) => {
  const identifier = Math.random().toString().replace(/0\./, "");
  return `${identifier}-${originalName}`;
};
const setBlobName = (fName, extn) => {
  const identifier = Math.random().toString().replace(/0\./, "");
  return `${fName}/${fName}-${identifier}.${extn}`;
};
async function saveToS3Multipart(
  buffer,
  parentfolder,
  contentType,
  sendorreceive
) {
  var partNum = 0;
  var numPartsLeft = 0;
  let promise = new Promise(function (resolve, reject) {
    let newContentType = contentType.split(";");
    let blobName = "";
    numPartsLeft = Math.ceil(buffer.length / partSize);
    allowedContentTypes.allowedContentTypes.some((element, index) => {
      if (element.mimeType == newContentType[0]) {
        blobName =
          parentfolder +
          "/" +
          sendorreceive +
          "/" +
          setBlobName(element.fName, element.extn);
      }
    });
    if (blobName != "") {
      var multiPartParams = {
        Bucket: bucket,
        Key: blobName,
        ContentType: contentType,
      };
      s3.createMultipartUpload(multiPartParams, function (mpErr, multipart) {
        if (mpErr) {
          console.log("Error!", mpErr);
          return;
        }
        var j = [];
        for (
          var rangeStart = 0;
          rangeStart < buffer.length;
          rangeStart += partSize
        ) {
          let obj = {
            rangeStart: rangeStart,
          };
          j.push(obj);
        }
        async.forEachSeries(
          j,
          (ele, next_ele) => {
            (async () => {
              partNum++;
              // console.log("partNum", partNum);
              var end = Math.min(ele.rangeStart + partSize, buffer.length),
                partParams = {
                  Body: buffer.slice(ele.rangeStart, end),
                  Bucket: bucket,
                  Key: blobName,
                  PartNumber: String(partNum),
                  UploadId: multipart.UploadId,
                };
              // console.log("partParams", partParams);
              s3.uploadPart(partParams, function (multiErr, mData) {
                if (multiErr) {
                  // console.log("multiErr", multiErr);
                  reject(
                    new Error({
                      msg: "An error occurred while completing the multipart upload",
                    })
                  );
                }
                // console.log("mData", mData);
                multipartMap.Parts[this.request.params.PartNumber - 1] = {
                  ETag: mData.ETag,
                  PartNumber: Number(this.request.params.PartNumber),
                };
                --numPartsLeft;
                // console.log("numPartsLeft", numPartsLeft);
                next_ele();
              });
            })().catch((error) => {
              console.log("catch error", error);
            });
          },
          async () => {
            if (numPartsLeft == 0) {
              var doneParams = {
                Bucket: bucket,
                Key: blobName,
                MultipartUpload: multipartMap,
                UploadId: multipart.UploadId,
              };
              // console.log("doneParams", doneParams)
              s3.completeMultipartUpload(doneParams, function (err, data) {
                if (err) {
                  console.log("err", err);
                  reject(
                    new Error({
                      msg: "An error occurred while completing the multipart upload",
                    })
                  );
                } else {
                  resolve({ msg: "file uploaded successfully", data: data });
                }
              });
            }
          }
        );
      });
    }
  });
  return promise;
}
async function saveToS3(buffer, parentfolder, contentType, sendorreceive) {
  let promise = new Promise(function (resolve, reject) {
    let newContentType = contentType.split(";");
    let blobName = "";
    allowedContentTypes.allowedContentTypes.some((element, index) => {
      if (element.mimeType == newContentType[0]) {
        blobName =
          parentfolder +
          "/" +
          sendorreceive +
          "/" +
          setBlobName(element.fName, element.extn);
      }
    });
    if (blobName != "") {
      var putParams = {
        Bucket: bucket,
        Key: blobName,
        Body: buffer,
        ContentType: contentType,
        ACL: acl,
        // ACL: 'public-read'
      };

      s3.upload(putParams, (err, data) => {
        if (err) {
          console.log("err", err);
          reject(
            new Error({ msg: "An error occurred while completing the upload" })
          );
        } else {
          resolve({ msg: "Image uploaded successfully", data: data });
        }
      });
    }
  });
  return promise;
}

async function deleteFromS3(fileKey) {
  let promise = new Promise(function (resolve, reject) {
    var params = {
      Bucket: bucket,
      Key: fileKey,
    };
    s3.deleteObject(params, function (err, data) {
      if (err)
        reject(new Error({ msg: "An error occurred while deleting the file" }));
      else resolve({ msg: "file deleted successfully", data: data });
    });
  });
  return promise;
}
module.exports = { saveToS3Multipart, saveToS3, deleteFromS3 };
