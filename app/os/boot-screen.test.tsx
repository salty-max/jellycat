import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BootScreen, ShutDownScreen } from "./boot-screen";
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

test("the shut-down screen restarts on a click", async () => {
  const onRestart = vi.fn();
  render(<ShutDownScreen onRestart={onRestart} />);
  await userEvent.click(screen.getByRole("button", { name: /shut down/i }));
  expect(onRestart).toHaveBeenCalledOnce();
});
