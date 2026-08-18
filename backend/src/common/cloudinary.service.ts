import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
    private readonly logger = new Logger(CloudinaryService.name);

    constructor(private readonly configService: ConfigService) {
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        });
    }

    /**
     * Upload file buffer to Cloudinary.
     * Returns the secure URL and public_id.
     */
    async upload(
        fileBuffer: Buffer,
        options: {
            folder?: string;
            resourceType?: 'auto' | 'image' | 'raw';
            publicId?: string;
        } = {},
    ): Promise<{ url: string; publicId: string }> {
        const { folder = 'focusflow/attachments', resourceType = 'auto', publicId } = options;

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: resourceType,
                    public_id: publicId,
                },
                (error, result: UploadApiResponse | undefined) => {
                    if (error) {
                        this.logger.error('Cloudinary upload failed', error);
                        reject(error);
                        return;
                    }
                    resolve({
                        url: result!.secure_url,
                        publicId: result!.public_id,
                    });
                },
            );

            const readable = new Readable();
            readable.push(fileBuffer);
            readable.push(null);
            readable.pipe(uploadStream);
        });
    }

    /**
     * Delete a file from Cloudinary by its public_id or URL.
     */
    async delete(publicIdOrUrl: string): Promise<void> {
        try {
            // Try extracting public_id from URL if needed
            let publicId = publicIdOrUrl;
            if (publicIdOrUrl.startsWith('http')) {
                // Extract public_id from Cloudinary URL
                const parts = publicIdOrUrl.split('/');
                const uploadIdx = parts.indexOf('upload');
                if (uploadIdx !== -1) {
                    // Get everything after 'upload/v{version}/'
                    publicId = parts
                        .slice(uploadIdx + 2)
                        .join('/')
                        .replace(/\.[^.]+$/, ''); // remove extension
                }
            }

            await cloudinary.uploader.destroy(publicId, {
                resource_type: 'raw',
            });
        } catch (error) {
            this.logger.warn(
                `Failed to delete from Cloudinary: ${publicIdOrUrl}`,
                error,
            );
        }
    }
}
