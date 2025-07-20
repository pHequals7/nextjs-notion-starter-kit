// const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = withBundleAnalyzer({
  images: {
    domains: [
      'www.notion.so',
      'notion.so',
      'images.unsplash.com',
      'pbs.twimg.com',
      'file.notion.so',
      's3.us-west-2.amazonaws.com',
      's3-us-west-2.amazonaws.com',
      'f.notion.so'
    ]
  },
  typescript: {
    ignoreBuildErrors: true
  }
})