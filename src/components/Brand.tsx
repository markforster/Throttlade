import { Navbar } from "react-bootstrap";

const LOGO_SIZE = 48;


export default function Brand() {
  return <Navbar.Brand className="me-auto d-flex align-items-center">
    <img
      src="icons/web-app-manifest-192x192.png"
      alt=""
      width={LOGO_SIZE}
      height={LOGO_SIZE}
      className="me-2"
      style={{ borderRadius: "0.25em", border: "solid 0.5px #0000" }}
    />
    Throttlade
  </Navbar.Brand>
}