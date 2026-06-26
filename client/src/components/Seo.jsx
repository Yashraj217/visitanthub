import { Helmet } from 'react-helmet-async';

const SITE = 'VisitantHub';
const BASE_URL = 'https://www.visitanthub.com';
const DEFAULT_IMAGE = `${BASE_URL}/VisitantHub_Main_Logo.png`;

export default function Seo({ title, description, path = '', image, noIndex = false, jsonLd }) {
  const fullTitle = title ? `${title} | ${SITE}` : `${SITE} – Visitor Management Made Effortless`;
  const canonical = `${BASE_URL}${path}`;
  const ogImage   = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type"        content="website" />
      <meta property="og:site_name"   content={SITE} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url"         content={canonical} />
      <meta property="og:image"       content={ogImage} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={ogImage} />

      {/* JSON-LD structured data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
