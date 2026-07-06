const kycModel = require('../models/kycModel');
const notificationModel = require('../models/notificationModel');

async function uploadDocument(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { docType } = req.body;
  if (!docType) return res.status(400).json({ error: 'docType is required' });

  const doc = await kycModel.submitDocument({
    userId: req.user.id,
    docType,
    filePath: req.file.path,
  });
  return res.status(201).json({ document: doc, message: 'Document submitted for verification' });
}

async function getMyDocuments(req, res) {
  const docs = await kycModel.getUserDocuments(req.user.id);
  return res.json({ documents: docs });
}

module.exports = { uploadDocument, getMyDocuments };
