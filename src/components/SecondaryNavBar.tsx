// import { Container, Button } from "react-bootstrap";
// import { Plus, Trash3 } from "react-bootstrap-icons";

// type SecondaryNavBarProps = {
//   openAdd: () => void;
// }
// export default function SecondaryNavBar({openAdd}: SecondaryNavBarProps) {
//   return <div className="bg-light border-bottom subnav-sticky">
//     <Container className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-2">
//       <div className="d-flex align-items-center gap-2">
//         <Button size="sm" variant="outline-primary" onClick={openAdd} title="Add project" aria-label="Add project">
//           <Plus className="me-1" size={16} />
//           Add project
//         </Button>
//       </div>

//       <div className="d-flex align-items-center gap-2">
//         <ProjectDropdown />
//         <Button
//           size="sm"
//           variant="outline-danger"
//           onClick={requestDeleteProject}
//           disabled={!currentId || projects.length <= 1}
//           title={projects.length <= 1 ? "Cannot delete the only project" : "Delete selected project"}
//           aria-label="Delete selected project"
//         >
//           <Trash3 className="me-1" size={16} />
//           {/* Delete project */}
//         </Button>
//       </div>
//     </Container>
//   </div>
// }