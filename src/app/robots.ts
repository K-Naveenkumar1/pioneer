import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://naveo.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/student/', '/admin/', '/api/', '/_next/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
