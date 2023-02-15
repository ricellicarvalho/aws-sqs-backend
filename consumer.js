import fs from "fs";
import request from "request";
import { config } from 'dotenv';
import cron from 'node-cron';
import aws from 'aws-sdk';

config();   

aws.config.update({ 
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const sqs = new aws.SQS();

const generateImage = (fileName) => {
  request('https://cataas.com/cat').pipe(
    fs.createWriteStream('imgs/' + fileName + '.png')
  );
}

const processor = () => {
  sqs.receiveMessage(
    {
      MaxNumberOfMessages: 10,
      QueueUrl: process.env.AWS_QUEUE_URL,
      WaitTimeSeconds: 10
    },
    (error, data) => {
      if(error) {
        console.log("Error", error);
      } else if(data.Messages) {
        console.log('Messages received from AWS SQS: ' + data.Messages.length);
  
        data.Messages.forEach(element => {
          generateImage(element.MessageId)
          sqs.deleteMessage(
            {
              QueueUrl: process.env.AWS_QUEUE_URL,
              ReceiptHandle: element.ReceiptHandle
            },
            (error, data) => {
              if(error) {
                console.log("Error deleting message from AWS SQS queue", error);
              } else {
                console.log("Message deleted from AWS SQS queue successfully");
              }
            }
          )
        });
      }          
    }
  )
}

cron.schedule('*/5 * * * * *', () => {

  console.log('...:Processing Cron Job:...');

  processor();

});