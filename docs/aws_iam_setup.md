# AWS IAM Setup Guide

For the AUTOops orchestrator, you need an IAM User with programmatic access so the `worker-agent` can execute commands on AWS.

## Step 1: Create IAM User via AWS CLI
Run this command from your local machine (assuming you have your root/admin AWS CLI configured):
```bash
aws iam create-user --user-name autoops-worker
```

## Step 2: Attach Required Policies
Attach the necessary permissions strictly for the MVP features:
```bash
aws iam attach-user-policy --user-name autoops-worker --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-user-policy --user-name autoops-worker --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess
aws iam attach-user-policy --user-name autoops-worker --policy-arn arn:aws:iam::aws:policy/IAMFullAccess
```

## Step 3: Generate Access Keys
Create the actual keys that the `worker-agent` will use to authenticate:
```bash
aws iam create-access-key --user-name autoops-worker
```

Copy the `AccessKeyId` and `SecretAccessKey` from the JSON output and place them in the `.env` file of your production environment:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
```
