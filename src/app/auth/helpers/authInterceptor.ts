import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthenticationService } from '../service';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private isRefreshing = false;

    constructor(private authService: AuthenticationService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const accessToken = this.authService.getAccessToken();

        if (accessToken) {
            request = this.addToken(request, accessToken);
        }

        return next.handle(request).pipe(
            catchError(error => {
                if (error.status === 401 && !this.isRefreshing) {
                    this.isRefreshing = true;
                    return this.authService.refreshToken().pipe(
                        switchMap((tokens: any) => {
                            this.isRefreshing = false;
                            return next.handle(this.addToken(request, tokens.accessToken));
                        }),
                        catchError((err) => {
                            this.isRefreshing = false;
                            this.authService.logout();
                            return throwError(err);
                        })
                    );
                }
                return throwError(error);
            })
        );
    }

    private addToken(request: HttpRequest<any>, token: string) {
        return request.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }
}
