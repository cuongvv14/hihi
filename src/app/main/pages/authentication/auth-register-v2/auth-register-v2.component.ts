import { Component, OnInit, ViewEncapsulation, OnDestroy } from "@angular/core";
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from "@angular/forms";

import { first, takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

import { CoreConfigService } from "@core/services/config.service";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthenticationService } from "app/auth/service";
import { ToastrService } from "ngx-toastr";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
@Component({
  selector: "app-auth-register-v2",
  templateUrl: "./auth-register-v2.component.html",
  styleUrls: ["./auth-register-v2.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class AuthRegisterV2Component implements OnInit, OnDestroy {
  // Public
  public coreConfig: any;
  public passwordTextType: boolean = false;
  public confPasswordTextType: boolean = false;
  public registerForm: UntypedFormGroup;
  public submitted = false;
  public error = "";
  public loading = false;
  public returnUrl: string;
  public otpForm: UntypedFormGroup;
  public showOtpForm = false;
  public submittedOtp = false;

  public resendingOtp = false; // Quản lý trạng thái gửi lại OTP
  public resendOtpMessage: string = ""; // Thông báo sau khi gửi OTP
  // Private
  private _unsubscribeAll: Subject<any> = new Subject();

  /**
   * Constructor
   */

  constructor(
    private _coreConfigService: CoreConfigService,
    private _authenticationService: AuthenticationService,
    private _formBuilder: UntypedFormBuilder,
    private _route: ActivatedRoute,
    private _router: Router,
    private toastr: ToastrService,
    private modalService: NgbModal
  ) {
    // Configure the layout
    this._coreConfigService.config = {
      layout: {
        navbar: { hidden: true },
        menu: { hidden: true },
        footer: { hidden: true },
        customizer: false,
        enableLocalStorage: false,
      },
    };
  }

  // Convenience getter for easy access to form fields
  get f() {
    return this.registerForm.controls;
  }
  get fOtp() {
    return this.otpForm.controls;
  }
  /**
   * Custom validator to check if password and confirm password match
   */
  mustMatch(password: string, confirmPassword: string) {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const passControl = formGroup.get(password);
      const confirmPassControl = formGroup.get(confirmPassword);

      if (!passControl || !confirmPassControl) {
        return null;
      }

      if (
        confirmPassControl.errors &&
        !confirmPassControl.errors["mustMatch"]
      ) {
        return null;
      }

      // So sánh giá trị của mật khẩu và xác nhận mật khẩu
      if (passControl.value !== confirmPassControl.value) {
        confirmPassControl.setErrors({ mustMatch: true });
      } else {
        confirmPassControl.setErrors(null);
      }

      return null;
    };
  }

  /**
   * Toggle password visibility
   */
  togglePasswordTextType() {
    this.passwordTextType = !this.passwordTextType;
  }

  toggleConfPasswordTextType() {
    this.confPasswordTextType = !this.confPasswordTextType;
  }

  // Phương thức gửi lại OTP
  resendOtp(): void {
    this.resendingOtp = true;
    this.resendOtpMessage = "";

    // Gọi API gửi lại OTP
    this._authenticationService
      .resendOtp(this.f.email.value)
      .pipe(first())
      .subscribe(
        (response) => {
          console.log(response);

          if (response.code === 201) {
            this.toastr.success(
              "OTP đã được gửi lại thành công!",
              "Thành công"
            );
            this.resendOtpMessage = response.message;
            this.resendingOtp = false;
          }
        },
        (error) => {
          this.toastr.error(
            "Có lỗi xảy ra khi gửi lại OTP. Vui lòng thử lại!",
            "Lỗi"
          );
          this.resendOtpMessage =
            "Có lỗi xảy ra khi gửi lại OTP. Vui lòng thử lại.";
          this.resendingOtp = false;
        }
      );
  }

  /**
   * On Submit
   */
  onSubmit() {
    this.submitted = true;

    // Stop here if the form is invalid
    if (this.registerForm.invalid) {
      this.toastr.error(
        "Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại!",
        "Đăng ký thất bại"
      );
      return;
    }

    // Register
    this.loading = true;

    this._authenticationService
      .register(
        this.f.email.value,
        this.f.password.value,
        this.f.organizationName.value
      )
      .pipe(first())
      .subscribe(
        (response) => {
          if (response.code === 201) {
            this.toastr.success(
              "Đăng ký thành công! Vui lòng nhập OTP để hoàn tất.",
              "Thành công"
            );
            this.showOtpForm = true; // Mở form OTP sau khi đăng ký thành công
            this.loading = false;
          } else {
            // Hiển thị thông báo lỗi từ phía server (nếu có)
            this.toastr.error("Đăng ký thất bại. Vui lòng thử lại.", "Lỗi");

            // Gán lỗi cho các trường cụ thể trong form
            if (response.message) {
              if (response.message.email) {
                this.registerForm.controls["email"].setErrors({
                  serverError: response.message.email,
                });
              }
              if (response.message.organizationName) {
                this.registerForm.controls["organizationName"].setErrors({
                  serverError: response.message.organizationName,
                });
              }
            }

            // Ngừng loading và không chuyển trang
            this.loading = false;
          }
        },
        (error) => {
          this.toastr.error(
            "Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.",
            "Lỗi"
          );
          this.loading = false;
        }
      );
  }

  onSubmitOtp() {
    this.submittedOtp = true;

    // stop here if form is invalid
    if (this.otpForm.invalid) {
      this.toastr.error("OTP không hợp lệ. Vui lòng kiểm tra lại!", "Lỗi OTP");
      return;
    }

    this.loading = true;

    this._authenticationService
      .verifyOtp(this.otpForm.value.otp)
      .pipe(first())
      .subscribe(
        (response) => {
          if (response.code === 201) {
            this.toastr.success(
              "Xác nhận OTP thành công! Bạn có thể đăng nhập.",
              "Thành công"
            );
            this.loading = false;
            this._router.navigate(["/pages/authentication/login-v2"]);
          } else {
            this.toastr.error(
              "Xác nhận OTP thất bại. Vui lòng thử lại!",
              "Lỗi OTP"
            );
            this.loading = false;
          }
        },
        (error) => {
          this.toastr.error(
            "Có lỗi xảy ra khi xác nhận OTP. Vui lòng thử lại.",
            "Lỗi"
          );
          this.loading = false;
        }
      );

    this.submittedOtp = false;
    this.otpForm.reset();
  }

  /**
   * On init
   */
  ngOnInit(): void {
    // Initialize the registration form with validations
    this.registerForm = this._formBuilder.group(
      {
        email: [
          "",
          [Validators.required, Validators.email, Validators.maxLength(255)],
        ],
        password: [
          "",
          [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(255),
            Validators.pattern(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/), // Pattern for strong password
          ],
        ],
        organizationName: [
          "",
          [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(255),
          ],
        ],
        confirmPassword: ["", Validators.required],
        acceptTerms: [false, Validators.requiredTrue],
      },
      {
        validator: this.mustMatch("password", "confirmPassword"), // Custom validator
      }
    );
    this.otpForm = this._formBuilder.group({
      otp: [
        "",
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(6),
          Validators.pattern(/^\d{6}$/),
        ],
      ],
    });
    // Get return url from route parameters or default to '/'

    // Subscribe to config changes
    this._coreConfigService.config
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((config) => {
        this.coreConfig = config;
      });
  }
  openTermsModal(termsModal: any) {
    this.modalService.open(termsModal, { ariaLabelledBy: "modal-basic-title" });
  }

  // Getter methods for form controls to easily access validation in the template
  get email() {
    return this.registerForm.get("email");
  }

  get password() {
    return this.registerForm.get("password");
  }

  get organizationName() {
    return this.registerForm.get("organizationName");
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
