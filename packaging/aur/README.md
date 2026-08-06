# AUR package — `dino-isekai-bin`

Gói AUR cài Dino Isekai trên Arch Linux (và các distro nền Arch như Manjaro,
EndeavourOS) bằng cách tải **gói `.deb`** từ GitHub Release rồi giải nén thẳng
vào hệ thống. File `.deb` của electron-builder đã có sẵn layout chuẩn FHS
(`/opt`, `.desktop`, icon, đúng quyền) nên không dính lỗi phân quyền như cách
giải nén AppImage trước đây.

## Cài đặt

```sh
yay -S dino-isekai-bin
# hoặc
paru -S dino-isekai-bin
```

Sau khi cài, chạy bằng lệnh `dino-isekai` hoặc mở từ menu ứng dụng.

## Cách hoạt động

- `source` trỏ tới `…/releases/download/v$pkgver/dino-isekai_${pkgver}_amd64.deb`.
- `package()` giải nén `data.tar.xz` của `.deb` thẳng vào `$pkgdir`
  (payload nằm ở `/opt/Dino Isekai`, kèm `.desktop` + icon sẵn quyền chuẩn).
- Set SUID cho `chrome-sandbox` (cần cho Electron sandbox) và tạo symlink
  `/usr/bin/dino-isekai` → `/opt/Dino Isekai/dino-isekai`.

## Phát hành lên AUR

### Tự động (khuyến nghị)
Job `publish-aur` trong `.github/workflows/build-release.yml` tự động:
1. Cập nhật `pkgver` theo tag.
2. Tính lại `sha256sums` từ AppImage vừa release (`updpkgsums`).
3. Sinh `.SRCINFO` và push lên `ssh://aur@aur.archlinux.org/dino-isekai-bin.git`.

**Yêu cầu một lần:**
- Tạo SSH key, thêm public key vào tài khoản AUR (https://aur.archlinux.org → My Account).
- Thêm private key vào GitHub repo secret tên **`AUR_SSH_PRIVATE_KEY`**.
- Lần đầu tên gói `dino-isekai-bin` sẽ được tạo tự động khi push (nếu tên còn trống).

### Thủ công
```sh
git clone ssh://aur@aur.archlinux.org/dino-isekai-bin.git
cd dino-isekai-bin
cp /đường/dẫn/packaging/aur/PKGBUILD .
updpkgsums                     # cập nhật sha256sums
makepkg --printsrcinfo > .SRCINFO
git add PKGBUILD .SRCINFO
git commit -m "Update to <version>"
git push
```

## Kiểm thử cục bộ

```sh
cd packaging/aur
updpkgsums          # cần .deb đã release sẵn cho pkgver hiện tại
makepkg -si
```
