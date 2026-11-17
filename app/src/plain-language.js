// Small, explicit vocabulary translations; no claims about implementation are added.
export function plainLanguage(text) {
 return String(text).replace(/^Interactive (?:conference )?prototype for (.+?) — (.+)\.$/i,'$1 is a demonstration of $2.').replace(/\bdata integration\b/gi,'bringing information from different systems together')
 .replace(/a \bcustomer-discovery\b/gi,'an early-feedback').replace(/\bsynthetic data\b/gi,'sample data')
 .replace(/\bsynthetic fixtures\b/gi,'sample records').replace(/\bdatasets\b/gi,'sets of information')
 .replace(/\bpipelines\b/gi,'data connections').replace(/\bmapping summary\b/gi,'How information is matched')
 .replace(/\bJSON\b/g,'data').replace(/\bvendor APIs\b/gi,'other companies’ systems');
}
