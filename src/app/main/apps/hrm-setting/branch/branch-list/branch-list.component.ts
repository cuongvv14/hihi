import { Component, OnInit, ViewChild, ViewEncapsulation } from "@angular/core";
import { ColumnMode, DatatableComponent } from "@swimlane/ngx-datatable";

import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { CoreConfigService } from "@core/services/config.service";
import { CoreSidebarService } from "@core/components/core-sidebar/core-sidebar.service";

import { BranchListService } from "./branch-list.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FlatpickrOptions } from "ng2-flatpickr";
import { FormBuilder, Validators } from "@angular/forms";
import { noFutureDateValidator } from "common/validation";

@Component({
  selector: "app-branch-list",
  templateUrl: "./branch-list.component.html",
  styleUrls: ["./branch-list.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class BranchListComponent implements OnInit {
  // Public
  public sidebarToggleRef = false;
  public rows;
  public selectedOption = 10;
  public ColumnMode = ColumnMode;
  public temp = [];
  public previousRoleFilter = "";
  public previousPlanFilter = "";
  public previousStatusFilter = "";

  public modalMode: "add" | "edit" | "view" = "add";
  public selectedBranch: any = null;

  public provinces = [];
  public districts = [];
  public wards = [];

  public selectRole: any = [
    { name: "All", value: "" },
    { name: "Admin", value: "Admin" },
    { name: "Author", value: "Author" },
    { name: "Editor", value: "Editor" },
    { name: "Maintainer", value: "Maintainer" },
    { name: "Subscriber", value: "Subscriber" },
  ];

  public selectPlan: any = [
    { name: "All", value: "" },
    { name: "Basic", value: "Basic" },
    { name: "Company", value: "Company" },
    { name: "Enterprise", value: "Enterprise" },
    { name: "Team", value: "Team" },
  ];

  public selectStatus: any = [
    { name: "All", value: "" },
    { name: "Pending", value: "Pending" },
    { name: "Active", value: "Active" },
    { name: "Inactive", value: "Inactive" },
  ];

  public selectedRole1 = [];
  public selectedPlan1 = [];
  public selectedStatus1 = [];
  public searchValue1 = "";

  // Decorator
  @ViewChild(DatatableComponent) table: DatatableComponent;

  // Private
  private tempData = [];
  private _unsubscribeAll: Subject<any>;
  private form: any;
  private patternPhone: string = "^(03|05|07|08|09)+([0-9]{8})$";
  private patternEmail: string = "^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$";
  private patternTax: string = "^[0-9]{10}$";
  /**
   * Constructor
   *
   * @param {CoreConfigService} _coreConfigService
   * @param {BranchListService} _branchListService
   * @param {CoreSidebarService} _coreSidebarService
   */
  constructor(
    private _branchListService: BranchListService,
    private _coreSidebarService: CoreSidebarService,
    private modalService: NgbModal,
    private _coreConfigService: CoreConfigService,
    private fb: FormBuilder
  ) {
    this._unsubscribeAll = new Subject();
    this.form = this.fb.group({
      branchName: [
        "",
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(255),
        ],
      ],
      province: ["", Validators.required],
      district: ["", Validators.required],
      ward: ["", Validators.required],
      specificAddress: [
        "",
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(255),
        ],
      ],
      email: ["", [Validators.required, Validators.pattern(this.patternEmail)]],
      phoneNumber: [
        "",
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(10),
          Validators.pattern(this.patternPhone),
        ],
      ],
      taxCode: ["", [Validators.required, Validators.pattern(this.patternTax)]],
    });
    this.fetchBranchList();
  }

  fetchBranchList(): void {
    this._branchListService.getDataTableRows().then((data) => {
      this.rows = data;
      console.log("Branches fetched:", data);
    });
  }

  onSubmitReactiveForm(modal): void {
    console.log(this.form);

    if (this.form.valid) {
      const formData = this.form.value;

      // Logging branch data for debugging
      console.log("Current branch list:", this.rows);

      // Kiểm tra trùng lặp ở phía frontend với dữ liệu trong this.rows
      const isDuplicateBranchName = this.rows.some(
        (branch) =>
          branch.branchName.trim().toLowerCase() ===
            formData.branchName.trim().toLowerCase() &&
          (this.modalMode === "add" || branch.id !== this.selectedBranch?.id) // Nếu là chế độ edit, không so sánh với chính nó
      );
      const isDuplicateEmail = this.rows.some(
        (branch) =>
          branch.email.trim().toLowerCase() ===
            formData.email.trim().toLowerCase() &&
          (this.modalMode === "add" || branch.id !== this.selectedBranch?.id)
      );
      const isDuplicateTaxCode = this.rows.some(
        (branch) =>
          branch.taxCode.trim() === formData.taxCode.trim() &&
          (this.modalMode === "add" || branch.id !== this.selectedBranch?.id)
      );
      const isDuplicatePhoneNumber = this.rows.some(
        (branch) =>
          branch.phoneNumber.trim() === formData.phoneNumber.trim() &&
          (this.modalMode === "add" || branch.id !== this.selectedBranch?.id)
      );

      // Nếu có lỗi trùng lặp, đặt lỗi cho các form control tương ứng
      if (isDuplicateBranchName) {
        this.BranchName.setErrors({ duplicate: true });
      }
      if (isDuplicateEmail) {
        this.Email.setErrors({ duplicate: true });
      }
      if (isDuplicateTaxCode) {
        this.TaxCode.setErrors({ duplicate: true });
      }
      if (isDuplicatePhoneNumber) {
        this.PhoneNumber.setErrors({ duplicate: true });
      }

      // Nếu không có trùng lặp, thực hiện thêm mới hoặc chỉnh sửa
      if (
        !isDuplicateBranchName &&
        !isDuplicateEmail &&
        !isDuplicateTaxCode &&
        !isDuplicatePhoneNumber
      ) {
        if (this.modalMode === "add") {
          // Chế độ thêm mới
          this._branchListService.createBranch(formData).subscribe(
            (response) => {
              console.log("Thêm chi nhánh thành công", response);
              modal.close(); // Đóng modal sau khi thêm thành công
              this.fetchBranchList(); // Cập nhật danh sách chi nhánh
              this.form.reset(); // Reset form sau khi thêm
            },
            (error) => {
              console.error("Có lỗi xảy ra", error);
            }
          );
        } else if (this.modalMode === "edit" && this.selectedBranch) {
          // Chế độ chỉnh sửa
          this._branchListService
            .updateBranch(this.selectedBranch.id, formData)
            .subscribe(
              (response) => {
                console.log("Chỉnh sửa chi nhánh thành công", response);
                modal.close(); // Đóng modal sau khi chỉnh sửa thành công
                this.fetchBranchList(); // Cập nhật danh sách chi nhánh
                this.form.reset(); // Reset form sau khi chỉnh sửa
              },
              (error) => {
                console.error("Có lỗi xảy ra", error);
              }
            );
        }
      }
    }
  }

  onProvinceChange(event) {
    const provinceId = event.target.value;
    if (provinceId) {
      this.loadDistricts(provinceId);
    }
  }

  onDistrictChange(event) {
    const districtId = event.target.value;
    if (districtId) {
      this.loadWards(districtId);
    }
  }

  loadDistricts(provinceId: string) {
    // Ví dụ dữ liệu huyện của từng tỉnh
    if (provinceId === "1") {
      this.districts = [
        { id: 1, name: "Ba Đình" },
        { id: 2, name: "Hoàn Kiếm" },
        // Thêm các huyện khác của Hà Nội
      ];
    } else if (provinceId === "2") {
      this.districts = [
        { id: 3, name: "Quận 1" },
        { id: 4, name: "Quận 2" },
        // Thêm các huyện khác của TP. Hồ Chí Minh
      ];
    }
    this.wards = []; // Reset danh sách xã khi thay đổi huyện
  }

  loadWards(districtId: string) {
    // Ví dụ dữ liệu xã/phường của từng huyện
    if (districtId === "1") {
      this.wards = [
        { id: 1, name: "Phường 1" },
        { id: 2, name: "Phường 2" },
        // Thêm các xã/phường khác của huyện Ba Đình
      ];
    } else if (districtId === "3") {
      this.wards = [
        { id: 3, name: "Phường 1" },
        { id: 4, name: "Phường 2" },
        // Thêm các xã/phường khác của quận 1
      ];
    }
  }
  get Province() {
    return this.form.get("province");
  }

  get District() {
    return this.form.get("district");
  }

  get Ward() {
    return this.form.get("ward");
  }

  get SpecificAddress() {
    return this.form.get("specificAddress");
  }

  get BranchName() {
    return this.form.get("branchName");
  }

  get Email() {
    return this.form.get("email");
  }

  get Address() {
    return this.form.get("address");
  }

  get PhoneNumber() {
    return this.form.get("phoneNumber");
  }

  get TaxCode() {
    return this.form.get("taxCode");
  }

  public basicDateOptions: FlatpickrOptions = {
    altInput: true,
  };

  // Public Methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * filterUpdate
   *
   * @param event
   */
  filterUpdate(event) {
    // Reset ng-select on search
    this.selectedRole1 = this.selectRole[0];
    this.selectedPlan1 = this.selectPlan[0];
    this.selectedStatus1 = this.selectStatus[0];

    const val = event.target.value.toLowerCase();

    // Filter Our Data
    const temp = this.tempData.filter(function (d) {
      return d.branchName.toLowerCase().indexOf(val) !== -1 || !val;
    });

    // Update The Rows
    this.rows = temp;
    // Whenever The Filter Changes, Always Go Back To The First Page
    this.table.offset = 0;
  }

  /**
   * Toggle the sidebar
   *
   * @param name
   */
  // modal Basic
  convertToDate(dateString: string): string {
    const date = new Date(dateString);
    // Chuyển đổi thành định dạng YYYY-MM-DD
    return date.toISOString().split("T")[0];
  }
  // Mở modal cho chức năng thêm mới
  openAddModal(modalRef): void {
    this.modalMode = "add";
    this.fetchBranchList();
    this.selectedBranch = null;
    this.form.reset(); // Reset form cho chức năng thêm mới
    this.form.enable();
    this.modalService.open(modalRef, {
      size: "lg",
      backdrop: "static",
      keyboard: false,
    }); // Mở modal và truyền tham chiếu modalRef
  }

  // Mở modal cho chức năng chỉnh sửa
  openEditModal(modalRef, branch): void {
    this.modalMode = "edit";
    this.selectedBranch = branch;

    // Không cần cập nhật `establishedDate` nữa, loại bỏ trường này
    const updatedBranch = {
      ...branch,
    };

    this.form.patchValue(updatedBranch); // Load dữ liệu chi nhánh vào form
    this.form.enable(); // Mở form để chỉnh sửa

    this.modalService.open(modalRef, {
      size: "lg",
      backdrop: "static",
      keyboard: false,
    }); // Mở modal và truyền tham chiếu modalRef
  }

  // Mở modal cho chức năng xem chi tiết
  openDetailsModal(modalRef, branch): void {
    this.modalMode = "view";
    this.selectedBranch = branch;

    const detailBranch = {
      ...branch,
    };

    this.form.patchValue(detailBranch); // Load dữ liệu chi nhánh vào form
    this.form.disable(); // Vô hiệu hóa form để chỉ xem (không chỉnh sửa)

    this.modalService.open(modalRef, {
      size: "lg",
      backdrop: "static",
      keyboard: false,
    });
  }

  openDeleteModal(modalRef, branch): void {
    this.selectedBranch = branch;
    this.modalService.open(modalRef, {
      size: "lg",
      backdrop: "static",
      keyboard: false,
    });
  }

  deleteBranch(modal): void {
    const branchId = this.selectedBranch.id;
    this._branchListService.deleteBranch([branchId]).subscribe(
      (response) => {
        console.log("Xóa chi nhánh thành công", response);
        modal.close(); // Đóng modal sau khi xóa thành công
        this.fetchBranchList(); // Cập nhật lại danh sách chi nhánh
      },
      (error) => {
        console.error("Có lỗi xảy ra khi xóa", error);
      }
    );
  }

  /**
   * Filter By Roles
   *
   * @param event
   */
  filterByRole(event) {
    const filter = event ? event.value : "";
    this.previousRoleFilter = filter;
    this.temp = this.filterRows(
      filter,
      this.previousPlanFilter,
      this.previousStatusFilter
    );
    this.rows = this.temp;
  }

  /**
   * Filter By Plan
   *
   * @param event
   */
  filterByPlan(event) {
    const filter = event ? event.value : "";
    this.previousPlanFilter = filter;
    this.temp = this.filterRows(
      this.previousRoleFilter,
      filter,
      this.previousStatusFilter
    );
    this.rows = this.temp;
  }

  /**
   * Filter By Status
   *
   * @param event
   */
  filterByStatus(event) {
    const filter = event ? event.value : "";
    this.previousStatusFilter = filter;
    this.temp = this.filterRows(
      this.previousRoleFilter,
      this.previousPlanFilter,
      filter
    );
    this.rows = this.temp;
  }

  /**
   * Filter Rows
   *
   * @param roleFilter
   * @param planFilter
   * @param statusFilter
   */
  filterRows(roleFilter, planFilter, statusFilter): any[] {
    // Reset search on select change
    this.searchValue1 = "";

    roleFilter = roleFilter.toLowerCase();
    planFilter = planFilter.toLowerCase();
    statusFilter = statusFilter.toLowerCase();

    return this.tempData.filter((row) => {
      const isPartialNameMatch =
        row.role.toLowerCase().indexOf(roleFilter) !== -1 || !roleFilter;
      const isPartialGenderMatch =
        row.currentPlan.toLowerCase().indexOf(planFilter) !== -1 || !planFilter;
      const isPartialStatusMatch =
        row.status.toLowerCase().indexOf(statusFilter) !== -1 || !statusFilter;
      return isPartialNameMatch && isPartialGenderMatch && isPartialStatusMatch;
    });
  }

  // Lifecycle Hooks
  // -----------------------------------------------------------------------------------------------------
  /**
   * On init
   */
  ngOnInit(): void {
    this.fetchBranchList();
    // Subscribe config change
    this._coreConfigService.config
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((config) => {
        //! If we have zoomIn route Transition then load datatable after 450ms(Transition will finish in 400ms)
        if (config.layout.animation === "zoomIn") {
          setTimeout(() => {
            this._branchListService.onBranchListChanged
              .pipe(takeUntil(this._unsubscribeAll))
              .subscribe((response) => {
                this.rows = response;
                this.tempData = this.rows;
              });
          }, 450);
        } else {
          this._branchListService.onBranchListChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response) => {
              this.rows = response;
              this.tempData = this.rows;
            });
        }
      });
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
