import React from "react";
import {Nav, Navbar} from "react-bootstrap";
import {LinkContainer} from 'react-router-bootstrap'

function Navigation() {
    return (
        <Navbar bg="dark" variant="dark">
            <Navbar.Brand href="#home" style={{paddingLeft:"10px"}}>MKTP Laboratory </Navbar.Brand>
            <Nav className="mr-auto">
                <LinkContainer to="/operator">
                    <Nav.Link>Manual operator</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/tank">
                    <Nav.Link>Tank model</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/tuning">
                    <Nav.Link>Mechanical tuning</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/manual">
                    <Nav.Link>Manual control</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/mechanical">
                    <Nav.Link>Mechanical control</Nav.Link>
                </LinkContainer>
            </Nav>
        </Navbar>
    );
}

export default Navigation;