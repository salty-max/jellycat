import { render, screen } from "@testing-library/react";
import { BootScreen } from "./boot-screen";
import { Crt } from "./crt";

test("the boot screen names the OS", () => {
  render(<BootScreen />);
  expect(screen.getByRole("heading", { name: "Jelly-OS 1.0" })).toBeInTheDocument();
});

test("the CRT layer is hidden from screen readers", () => {
  const { container } = render(
    <Crt>
      <p>screen</p>
    </Crt>,
  );
  expect(container.querySelector(".crt-overlay")).toHaveAttribute("aria-hidden", "true");
});
