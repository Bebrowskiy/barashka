type RouteHandler = (params: { page: string; param: string; provider: string | null; id: string }) => void;

const extractProviderAndId = (p: string): { provider: string | null; id: string } => {
    if (p.startsWith('y/')) return { provider: 'youtube', id: p.slice(2) };
    if (p.startsWith('y:')) return { provider: 'youtube', id: p };
    return { provider: null, id: p };
};

let handler: RouteHandler | null = null;

function parsePath(pathname: string): { page: string; param: string; provider: string | null; id: string } {
    let path = pathname;
    if (path.startsWith('/')) path = path.substring(1);
    if (path.endsWith('/')) path = path.substring(0, path.length - 1);
    if (path === '' || path === 'index.html') path = 'home';

    const parts = path.split('/');
    const page = parts[0];
    const param = decodeURIComponent(parts.slice(1).join('/'));
    const { provider, id } = extractProviderAndId(param);

    return { page, param, provider, id };
}

function onPopState() {
    if (!handler) return;
    handler(parsePath(window.location.pathname));
}

export function navigate(path: string): void {
    if (path === window.location.pathname) return;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
}

export function initRouter(onRoute: RouteHandler): void {
    handler = onRoute;
    window.addEventListener('popstate', onPopState);

    if (window.location.hash && window.location.hash.length > 1) {
        const hash = window.location.hash.substring(1);
        if (hash.includes('/')) {
            const newPath = hash.startsWith('/') ? hash : '/' + hash;
            window.history.replaceState(null, '', newPath);
        }
    }

    onRoute(parsePath(window.location.pathname));
}

export function getCurrentPath(): string {
    return window.location.pathname;
}

export { parsePath };
