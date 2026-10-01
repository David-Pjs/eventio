import { isHttpUrl } from '@eventio/radar-sources';

export const safeHref = (url: string): string => (isHttpUrl(url) ? url : '#');
