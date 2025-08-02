// Simple test for sweep-line collision detection
import { SweepLineCollisionDetector } from './sweep-line-collision.js';

function testSweepLineCollision() {
  const detector = new SweepLineCollisionDetector();
  
  console.log('Testing Sweep-Line Collision Detection...');
  
  // Test 1: Circle completely inside triangle
  const triangle = SweepLineCollisionDetector.createSimplePolygon('triangle', 100, 100, 50, 0);
  const circleInside = { x: 100, y: 100, radius: 10 };
  
  const result1 = detector.checkCirclePolygonCollision(circleInside, triangle);
  console.log('Test 1 - Circle inside triangle:', result1 ? 'PASS' : 'FAIL');
  
  // Test 2: Circle completely outside triangle
  const circleOutside = { x: 200, y: 200, radius: 10 };
  const result2 = detector.checkCirclePolygonCollision(circleOutside, triangle);
  console.log('Test 2 - Circle outside triangle:', !result2 ? 'PASS' : 'FAIL');
  
  // Test 3: Circle intersecting triangle edge
  const circleIntersecting = { x: 130, y: 100, radius: 20 };
  const result3 = detector.checkCirclePolygonCollision(circleIntersecting, triangle);
  console.log('Test 3 - Circle intersecting triangle:', result3 ? 'PASS' : 'FAIL');
  
  // Test 4: Rectangle collision
  const rectangle = SweepLineCollisionDetector.createSimplePolygon('rectangle', 50, 50, 40, 0);
  const circleRect = { x: 65, y: 50, radius: 10 };
  const result4 = detector.checkCirclePolygonCollision(circleRect, rectangle);
  console.log('Test 4 - Circle intersecting rectangle:', result4 ? 'PASS' : 'FAIL');
  
  console.log('Sweep-line collision tests completed.');
  
  return {
    triangle,
    results: [result1, !result2, result3, result4]
  };
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  testSweepLineCollision();
}

export { testSweepLineCollision };