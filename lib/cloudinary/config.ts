// Cloudinary configuration
const CLOUD_NAME = 'zizo-dev'
const UPLOAD_PRESET = 'self-vibe'

// Upload configuration
const uploadOptions = {
    upload_preset: UPLOAD_PRESET,
    unsigned: true,
}

// Function to compress/resize image on the client side
export const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<File> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const img = new Image()

        img.onload = () => {
            // Calculate new dimensions
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
            canvas.width = img.width * ratio
            canvas.height = img.height * ratio

            // Draw and compress
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        })
                        resolve(compressedFile)
                    } else {
                        resolve(file) // Fallback to original if compression fails
                    }
                },
                'image/jpeg',
                quality
            )
        }

        img.src = URL.createObjectURL(file)
    })
}

export const uploadImageToCloudinary = async (
    file: File, 
    folder?: string,
    context?: Record<string, string>
): Promise<{
    url: string
    secure_url: string
    public_id: string
    width: number
    height: number
    bytes: number
    format: string
}> => {
    // Compress image before upload for medical files
    const compressedFile = await compressImage(file, 1200, 0.8)
    
    const formData = new FormData()
    formData.append('file', compressedFile)
    formData.append('upload_preset', uploadOptions.upload_preset)
    
    // Add folder for organization
    if (folder) {
        formData.append('folder', folder)
    }
    
    // Add context metadata
    if (context) {
        formData.append('context', Object.entries(context).map(([key, value]) => `${key}=${value}`).join('|'))
    }
    
    // Add tags for better organization
    formData.append('tags', 'vai-neurosurgery,medical-image')

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        )

        if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.status}`)
        }

        const result = await response.json()
        
        return {
            url: result.url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format
        }
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error)
        throw new Error('Failed to upload image')
    }
}

// Helper functions for generating optimized URLs
export const getOptimizedImageUrl = (
    publicId: string, 
    width?: number, 
    height?: number, 
    quality: string = 'auto'
): string => {
    const transformations = []
    
    if (width || height) {
        transformations.push(`c_limit,w_${width || 'auto'},h_${height || 'auto'}`)
    }
    
    transformations.push(`q_${quality}`, 'f_auto')
    
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations.join(',')}/${publicId}`
}

export const getThumbnailUrl = (publicId: string): string => {
    return getOptimizedImageUrl(publicId, 200, 200)
}

// Generate folder path for patient media
export const generatePatientMediaFolder = (patientId: string, mediaType: string): string => {
    return `vai-neurosurgery/patients/${patientId}/${mediaType}`
}