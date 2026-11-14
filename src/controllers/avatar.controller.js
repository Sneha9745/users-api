
import { badRequest } from '../utils/http-error.js';

export class AvatarController {
  constructor(avatarService) {
    this.avatars = avatarService;
  }

  upload = async (req, res) => {
    if (!req.file) {
      throw badRequest('Avatar file is required');
    }

    const user = await this.avatars.setAvatar(req.params.id, req.file.buffer);
    res.status(200).json({ data: user });
  };

  remove = async (req, res) => {
    const user = await this.avatars.removeAvatar(req.params.id);
    res.status(200).json({ data: user });
  };

  createDirectUpload = async (req, res) => {
    const upload = await this.avatars.createDirectUpload(req.params.id, req.body);
    res.status(201).json({ data: upload });
  };

  completeDirectUpload = async (req, res) => {
    const user = await this.avatars.completeDirectUpload(req.params.id, req.body.key);
    res.status(200).json({ data: user });
  };
}
