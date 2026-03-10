import React from 'react';
import { Link } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';

function Home() {
  return (
    <div className="py-4">
      <h1 className="text-center mb-4">Welcome to Via Web App</h1>
      
      <Card className="mb-4 shadow-sm">
        <Card.Body className="text-center py-5">
          <h2 className="mb-3">Play Games</h2>
          <p className="text-muted mb-4">Choose a game to play</p>
          <Link to="/connect4">
            <Button variant="primary" size="lg">Play Connect 4</Button>
          </Link>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <h3>About Via</h3>
          <p className="text-muted">
            This is a modern web application built with React, Vite, Bootstrap, 
            Express, and PostgreSQL via Prisma ORM.
          </p>
        </Card.Body>
      </Card>
    </div>
  );
}

export default Home;