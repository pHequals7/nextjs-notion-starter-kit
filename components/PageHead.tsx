import Head from 'next/head'
import * as React from 'react'
import * as types from 'lib/types'

// TODO: remove duplication between PageHead and NotionPage Head

interface PageHeadProps extends types.PageProps {
  title?: string
  description?: string
  image?: string
  url?: string
}

export const PageHead: React.FC<PageHeadProps> = ({ 
  site,
  title,
  description,
  image,
  url
}) => {
  return (
    <Head>
      <meta charSet='utf-8' />
      <meta httpEquiv='Content-Type' content='text/html; charset=utf-8' />
      <meta
        name='viewport'
        content='width=device-width, initial-scale=1, shrink-to-fit=no'
      />

      {description && (
        <>
          <meta name='description' content={description} />
          <meta property='og:description' content={description} />
        </>
      )}

      {title && (
        <>
          <title>{title}</title>
          <meta property='og:title' content={title} />
        </>
      )}

      {image && <meta property='og:image' content={image} />}
      {url && <meta property='og:url' content={url} />}

      <meta name='theme-color' content='#EB625A' />
      <meta property='og:type' content='website' />
    </Head>
  )
}
