import { Navbar, Nav, Container } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';

export default function Navigation() {
    return (
        <Navbar bg="dark" variant="dark" expand="md" fixed="top">
            <Container fluid>
                {/* Brand links to Manual by default */}
                <Navbar.Brand as={NavLink} to="/manual">MKTP Laboratory</Navbar.Brand>

                <Navbar.Toggle aria-controls="main-nav" />
                <Navbar.Collapse id="main-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={NavLink} to="/manual" end>
                            Manual control
                        </Nav.Link>
                        <Nav.Link as={NavLink} to="/mechanical" end>
                            Mechanical control
                        </Nav.Link>
                        <Nav.Link as={NavLink} to="/electronic" end>
                            Electronic control
                        </Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}
